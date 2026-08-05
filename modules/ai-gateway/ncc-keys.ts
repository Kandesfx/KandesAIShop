import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { encrypt } from '@/lib/encryption'
import { ConflictError } from '@/lib/errors'
import type { AiProvider as PrismaAiProvider, AiNccKeyStatus } from '@prisma/client'
import type { NccKeyView, NccKeyCreateInput } from './types'
import { CcProProvider } from './providers/ccpro'

/**
 * NCC key pool — Phase 6 P6-07.
 *
 * Quản lý pool NCC API keys Kandes dùng để forward cho KH:
 *   - Admin add NCC keys (plaintext → encrypt AES-256-GCM).
 *   - Pick key từ pool theo FIFO highest balance (D23 pattern — transaction FOR UPDATE).
 *   - Sync balance từ NCC API (P6-07 test connection).
 *
 * Phase 6 chỉ dùng provider `ccpro`. Enum giữ nguyên cho Phase 7+ mở rộng.
 */

/**
 * Pick 1 active NCC key từ pool — FIFO theo remainingUsd DESC.
 * Trả null nếu pool exhausted.
 *
 * Race-safe: dùng transaction `SELECT ... FOR UPDATE` qua `$queryRaw`.
 * Phase 6 chỉ 1 instance/worker — D23 pattern.
 */
export async function pickFromPool(
  provider: PrismaAiProvider
): Promise<NccKeyView | null> {
  const candidate = await db.$transaction(async (tx) => {
    const row = await tx.$queryRaw<
      Array<{
        id: string
        provider: PrismaAiProvider
        total_quota_usd: Prisma.Decimal
        remaining_usd: Prisma.Decimal
        nickname: string | null
        status: AiNccKeyStatus
        last_synced_at: Date | null
        created_at: Date
        updated_at: Date
      }>
    >`
      SELECT id, provider, total_quota_usd, remaining_usd, nickname, status,
             last_synced_at, created_at, updated_at
      FROM ai_ncc_keys
      WHERE provider = ${provider}::"AiProvider"
        AND status = 'active'
        AND remaining_usd > 0
      ORDER BY remaining_usd DESC
      LIMIT 1
      FOR UPDATE
    `
    return row[0] ?? null
  })

  if (!candidate) return null

  return {
    id: candidate.id,
    provider: candidate.provider,
    totalQuotaUsd: Number(candidate.total_quota_usd),
    remainingUsd: Number(candidate.remaining_usd),
    nickname: candidate.nickname,
    status: candidate.status,
    lastSyncedAt: candidate.last_synced_at,
    createdAt: candidate.created_at,
    updatedAt: candidate.updated_at,
  }
}

/** Admin add NCC key (plaintext → encrypt). */
export async function addNccKey(input: NccKeyCreateInput): Promise<NccKeyView> {
  const ciphertext = encrypt(input.apiKey)

  const row = await db.aiNccKey.create({
    data: {
      provider: input.provider,
      apiKeyEncrypted: ciphertext,
      totalQuotaUsd: new Prisma.Decimal(input.totalQuotaUsd),
      remainingUsd: new Prisma.Decimal(input.totalQuotaUsd),
      nickname: input.nickname ?? null,
      status: 'active',
    },
  })

  logger.info(
    {
      nccKeyId: row.id,
      provider: row.provider,
      nickname: row.nickname,
      totalQuotaUsd: input.totalQuotaUsd,
    },
    'ncc-keys: added new key to pool'
  )

  return {
    id: row.id,
    provider: row.provider,
    totalQuotaUsd: Number(row.totalQuotaUsd),
    remainingUsd: Number(row.remainingUsd),
    nickname: row.nickname,
    status: row.status,
    lastSyncedAt: row.lastSyncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** List NCC keys — paginated + filter. */
export async function listNccKeys(filter: {
  status?: AiNccKeyStatus
  provider?: PrismaAiProvider
  page: number
  pageSize: number
}): Promise<{ items: NccKeyView[]; total: number }> {
  const where: Prisma.AiNccKeyWhereInput = {}
  if (filter.status) where.status = filter.status
  if (filter.provider) where.provider = filter.provider

  const [rows, total] = await Promise.all([
    db.aiNccKey.findMany({
      where,
      orderBy: [{ status: 'asc' }, { remainingUsd: 'desc' }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    db.aiNccKey.count({ where }),
  ])

  return {
    items: rows.map(toView),
    total,
  }
}

/** Update nickname/status (admin). KHÔNG update apiKeyEncrypted — phải tạo mới. */
export async function updateNccKey(
  id: string,
  patch: { nickname?: string; status?: AiNccKeyStatus }
): Promise<NccKeyView> {
  const row = await db.aiNccKey.update({
    where: { id },
    data: patch,
  })
  return toView(row)
}

/** Disable key (admin "soft delete"). KHÔNG xoá — audit trail + KH vẫn reference. */
export async function disableNccKey(id: string): Promise<NccKeyView> {
  return updateNccKey(id, { status: 'disabled' })
}

/** Get 1 NCC key by id (admin view). */
export async function getNccKey(id: string): Promise<NccKeyView | null> {
  const row = await db.aiNccKey.findUnique({ where: { id } })
  return row ? toView(row) : null
}

/** Decrypt NCC key plaintext (admin only — test connection). */
export async function decryptNccKey(id: string): Promise<string | null> {
  const row = await db.aiNccKey.findUnique({ where: { id }, select: { apiKeyEncrypted: true } })
  if (!row) return null
  const { decrypt } = await import('@/lib/encryption')
  return decrypt(Buffer.from(row.apiKeyEncrypted))
}

/** Sync balance từ NCC API (P6-07 test connection + cron balance-sync). */
export async function setNccKeyBalance(
  id: string,
  remainingUsd: number
): Promise<NccKeyView> {
  // Phase 7-RB (D57): cần totalQuotaUsd để set low_balance.
  const key = await db.aiNccKey.findUnique({ where: { id }, select: { totalQuotaUsd: true } })
  const total = key ? Number(key.totalQuotaUsd) : 0
  const status = computeStatus(remainingUsd, total)
  const row = await db.aiNccKey.update({
    where: { id },
    data: {
      remainingUsd: new Prisma.Decimal(remainingUsd),
      status,
      lastSyncedAt: new Date(),
    },
  })
  return toView(row)
}

/**
 * Tính status theo balance / total ratio (Phase 7-RB D57).
 * - remainingUsd > 10% total → active
 * - 0 < remainingUsd ≤ 10%  → low_balance
 * - remainingUsd == 0        → exhausted
 */
export function computeStatus(
  remainingUsd: number,
  totalQuotaUsd: number
): AiNccKeyStatus {
  if (remainingUsd <= 0) return 'exhausted'
  if (totalQuotaUsd <= 0) return 'active' // total invalid → don't auto-downgrade
  const ratio = remainingUsd / totalQuotaUsd
  if (ratio <= 0.1) return 'low_balance'
  return 'active'
}

/**
 * Sync balance từ NCC `/v1/usage` (Phase 7-RB D57).
 * Trả về transition {previousStatus, newStatus, remainingUsd, totalQuotaUsd}.
 *
 * Nếu NCC trả quota=null → throw (giữ status cũ).
 */
export async function syncNccKeyBalance(
  nccKeyId: string,
  plaintextApiKey: string
): Promise<{
  previousStatus: AiNccKeyStatus
  newStatus: AiNccKeyStatus
  remainingUsd: number
  totalQuotaUsd: number
}> {
  const key = await db.aiNccKey.findUnique({ where: { id: nccKeyId } })
  if (!key) throw new Error(`NCC key ${nccKeyId} not found`)

  const provider = new CcProProvider()
  const usage = await provider.getUsage(plaintextApiKey)

  const remaining = Number(usage.remaining ?? usage.quota?.remaining ?? 0)
  const total = Number(key.totalQuotaUsd)
  const newStatus = computeStatus(remaining, total)

  await db.aiNccKey.update({
    where: { id: nccKeyId },
    data: {
      remainingUsd: new Prisma.Decimal(remaining),
      status: newStatus,
      lastSyncedAt: new Date(),
    },
  })

  return {
    previousStatus: key.status,
    newStatus,
    remainingUsd: remaining,
    totalQuotaUsd: total,
  }
}

function toView(row: {
  id: string
  provider: PrismaAiProvider
  totalQuotaUsd: Prisma.Decimal
  remainingUsd: Prisma.Decimal
  nickname: string | null
  status: AiNccKeyStatus
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): NccKeyView {
  return {
    id: row.id,
    provider: row.provider,
    totalQuotaUsd: Number(row.totalQuotaUsd),
    remainingUsd: Number(row.remainingUsd),
    nickname: row.nickname,
    status: row.status,
    lastSyncedAt: row.lastSyncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export { ConflictError }