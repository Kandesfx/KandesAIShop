import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { decrypt } from '@/lib/encryption'
import { sha256, constantTimeEqual } from './token'
import type { AuthContext, AiProviderName } from './types'

/**
 * AI Gateway auth — Phase 6 P6-03 + Passthrough mode.
 *
 * Hỗ trợ 2 loại API key:
 *
 * 1. Kandes API key (`ks-xxx`):
 *    - Xác thực Bearer `ks-xxx` token, resolve user + plan + NCC upstream key.
 *    - Token format: `ks-` + 16 chars base64url random.
 *    - Storage: SHA-256 hash + unique 12-char prefix (keyPrefix).
 *
 * 2. Raw NCC key passthrough (`sk-jy-cx-*` hoặc `sk-jy-cc-*`):
 *    - Cho phép KH dùng trực tiếp key NCC Pro gốc.
 *    - Forward thẳng đến NCC Pro, không qua Kandes key management.
 *    - Phát hiện provider dựa trên prefix:
 *      - `sk-jy-cx-*` → ccpro (GPT models)
 *      - `sk-jy-cc-*` → ccpro (Claude models)
 *    - Không có rate-limit/soft-cap tracking (passthrough mode).
 *
 * Flow:
 *   1. Parse `Authorization: Bearer <token>`.
 *   2. Nếu `sk-jy-cx-` hoặc `sk-jy-cc-` → Passthrough mode.
 *   3. Nếu `ks-` → Kandes auth flow (existing).
 */

const TOKEN_MIN_LENGTH = 16

/** Regex for raw NCC passthrough keys. */
const NCC_KEY_REGEX = /^sk-jy-(cx|cc)-[a-zA-Z0-9]+$/

/** Detect provider from NCC key prefix. */
function detectNccProvider(key: string): AiProviderName {
  if (key.startsWith('sk-jy-cc-')) return 'ccpro' // Claude models
  return 'ccpro' // Default to ccpro (GPT models)
}

export type { GeneratedToken } from './token'
export { generateApiToken, sha256, constantTimeEqual } from './token'

/** Extract API key from x-api-key or Authorization Bearer header. */
function extractApiKey(req: Request): string | null {
  const xApiKey = req.headers.get('x-api-key')
  if (xApiKey) return xApiKey.trim()

  const authHeader = req.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
  return match?.[1]?.trim() ?? null
}

/**
 * Authenticate Bearer API key request.
 * Throw UnauthorizedError / ForbiddenError on failure.
 * Trả về AuthContext với everything cần để forward + log usage.
 *
 * Hỗ trợ:
 * - `sk-jy-cx-*` / `sk-jy-cc-*` → Passthrough mode (forward trực tiếp đến NCC Pro)
 * - `ks-*` → Kandes auth mode (existing flow)
 */
export async function authenticateApiKey(req: Request): Promise<AuthContext> {
  const token = extractApiKey(req)
  if (!token) {
    throw new UnauthorizedError('Missing Authorization Bearer or x-api-key header')
  }

  // Passthrough mode: raw NCC key
  if (NCC_KEY_REGEX.test(token)) {
    logger.info({ keyPrefix: token.slice(0, 16) + '***' }, 'auth: passthrough NCC key')
    return {
      apiKey: {
        id: 'passthrough',
        userId: 'passthrough',
        planId: 'passthrough',
        nccKeyId: null,
        pinnedNccKeyId: null,
        rotationPolicy: 'auto',
        source: 'passthrough',
        expiresAt: null,
        quotaUsedTokens: 0n,
      },
      user: {
        id: 'passthrough',
        email: 'passthrough@kandes.shop',
        role: 'passthrough',
      },
      plan: {
        id: 'passthrough',
        name: 'Passthrough',
        slug: 'passthrough',
        rateLimitPerMinute: 1000,
        quotaTokens: 0n,
        softCapTokens: 0n,
      },
      upstreamApiKey: token,
      provider: detectNccProvider(token),
    }
  }

  // Kandes auth mode: ks-xxx format
  if (!token.startsWith('ks-') || token.length < TOKEN_MIN_LENGTH) {
    throw new UnauthorizedError('Invalid API key format')
  }

  const keyPrefix = token.slice(0, 12)
  const apiKeyRow = await db.aiApiKey.findUnique({
    where: { keyPrefix },
    include: {
      plan: true,
      user: { select: { id: true, email: true, role: true, status: true } },
      nccKey: true,
      pinnedNccKey: true,
    },
  })

  if (!apiKeyRow) {
    // Constant-ish delay để chống timing attack enumerate prefix.
    await new Promise((r) => setTimeout(r, 50))
    throw new UnauthorizedError('Invalid API key')
  }

  // Verify hash (constant-time)
  const expectedHash = sha256(token)
  if (!constantTimeEqual(expectedHash, apiKeyRow.keyHash)) {
    await new Promise((r) => setTimeout(r, 50))
    throw new UnauthorizedError('Invalid API key')
  }

  if (apiKeyRow.status !== 'active') {
    throw new ForbiddenError(`API key is ${apiKeyRow.status}`)
  }

  if (apiKeyRow.expiresAt && apiKeyRow.expiresAt.getTime() < Date.now()) {
    throw new ForbiddenError('API key expired')
  }

  if (apiKeyRow.user.status !== 'active') {
    throw new ForbiddenError('User account is not active')
  }

  if (!apiKeyRow.plan.isActive) {
    throw new ForbiddenError('Plan is no longer active')
  }

  // Resolve upstream API key.
  // Phase 7-RB (D55): branch theo rotationPolicy.
  //   - 'auto': dùng nccKey (giữ Phase 6 default — gateway chọn lúc bind).
  //   - 'pinned': KH pin 1 NCC key cụ thể (qua PATCH /api/me/ai-keys/[id]/rotation).
  //     Nếu pinned key exhausted → fallback auto từ pool + log warn.
  const rotationPolicy = (apiKeyRow.rotationPolicy ?? 'auto') as 'auto' | 'pinned'
  const effectiveNccKey = resolveEffectiveNccKey(apiKeyRow.nccKey, apiKeyRow.pinnedNccKey, rotationPolicy)
  if (!effectiveNccKey) {
    throw new ForbiddenError('API key không gắn NCC upstream — liên hệ admin')
  }
  if (effectiveNccKey.status === 'exhausted' || effectiveNccKey.status === 'disabled') {
    if (rotationPolicy === 'pinned') {
      // KH pin → fail loud, KHÔNG fallback.
      throw new ForbiddenError(`NCC upstream ${effectiveNccKey.status}`)
    }
    // Auto + key exhausted → không nên xảy ra (admin đã mark), fail closed.
    throw new ForbiddenError(`NCC upstream ${effectiveNccKey.status}`)
  }

  let upstreamApiKey: string
  try {
    upstreamApiKey = decrypt(Buffer.from(effectiveNccKey.apiKeyEncrypted))
  } catch (err) {
    logger.error(
      { err: (err as Error).message, apiKeyId: apiKeyRow.id, nccKeyId: effectiveNccKey.id },
      'auth: failed to decrypt NCC key'
    )
    throw new ForbiddenError('NCC upstream key corrupt — liên hệ admin')
  }

  // Update lastUsedAt async — không block auth.
  void db.aiApiKey
    .update({
      where: { id: apiKeyRow.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => {
      logger.warn(
        { err: (err as Error).message, apiKeyId: apiKeyRow.id },
        'auth: failed to update lastUsedAt (non-fatal)'
      )
    })

  return {
    apiKey: {
      id: apiKeyRow.id,
      userId: apiKeyRow.userId,
      planId: apiKeyRow.planId,
      nccKeyId: apiKeyRow.nccKeyId,
      pinnedNccKeyId: apiKeyRow.pinnedNccKeyId,
      rotationPolicy,
      source: apiKeyRow.source,
      expiresAt: apiKeyRow.expiresAt,
      quotaUsedTokens: apiKeyRow.quotaUsedTokens,
    },
    user: {
      id: apiKeyRow.user.id,
      email: apiKeyRow.user.email,
      role: apiKeyRow.user.role,
    },
    plan: {
      id: apiKeyRow.plan.id,
      name: apiKeyRow.plan.name,
      slug: apiKeyRow.plan.slug,
      rateLimitPerMinute: apiKeyRow.plan.rateLimitPerMinute,
      quotaTokens: apiKeyRow.plan.quotaTokens,
      softCapTokens: apiKeyRow.plan.softCapTokens,
    },
    upstreamApiKey,
    provider: effectiveNccKey?.provider ?? 'ccpro',
  }
}

/**
 * Resolve NCC key thực tế để forward.
 * - 'pinned' + pinnedNccKey còn active → dùng pinned.
 * - 'pinned' + pinnedNccKey exhausted/disabled → fallback nccKey (auto), log warn.
 * - 'auto' → dùng nccKey.
 */
function resolveEffectiveNccKey(
  nccKey: { id: string; provider: AiProviderName; status: string; apiKeyEncrypted: Buffer } | null,
  pinnedNccKey: { id: string; provider: AiProviderName; status: string; apiKeyEncrypted: Buffer } | null,
  policy: 'auto' | 'pinned'
): { id: string; provider: AiProviderName; status: string; apiKeyEncrypted: Buffer } | null {
  if (policy === 'pinned' && pinnedNccKey) {
    if (pinnedNccKey.status === 'active' || pinnedNccKey.status === 'low_balance') {
      return pinnedNccKey
    }
    // Pinned key không khả dụng → fallback nccKey + warn.
    logger.warn(
      { nccKeyId: pinnedNccKey.id, status: pinnedNccKey.status },
      'auth: pinned NCC key unavailable, fallback to default'
    )
  }
  return nccKey
}