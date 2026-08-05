import type { User } from '@prisma/client'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import * as repo from './repository'
import type {
  AddStockInput,
  ListInventoryInput,
  BatchSource,
} from './validators'
import type {
  InventoryItemView,
  ListInventoryResult,
  InventoryBatchView,
} from './types'

/**
 * Inventory service — Phase 3 P3-03.
 *
 * Business logic cho inventory management.
 * Route boundary gọi service, service gọi repo.
 *
 * Role guard:
 *   - addStock/listForAdmin: admin only.
 *   - reserve/markDelivered: delivery service gọi (internal).
 */

const ADMIN_ROLES = ['admin', 'super_admin'] as const
type AdminRole = (typeof ADMIN_ROLES)[number]

function isAdmin(user: Pick<User, 'role'>): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(user.role)
}

/**
 * Add stock — admin only.
 * Trả batchId + count inserted/skipped (dedupe qua fingerprint).
 */
export async function addStock(input: AddStockInput, user: Pick<User, 'id' | 'role'>, source: BatchSource = 'manual') {
  if (!isAdmin(user)) {
    throw new ForbiddenError('Chỉ admin mới thêm kho')
  }

  // Validate product tồn tại
  const product = await db.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  })
  if (!product) {
    throw new NotFoundError('Sản phẩm không tồn tại')
  }

  const result = await repo.addStock({
    productId: input.productId,
    variantId: input.variantId ?? null,
    values: input.values,
    source,
    importedBy: user.id,
    note: input.note,
  })

  logger.info(
    {
      batchId: result.batchId,
      productId: input.productId,
      requested: result.requested,
      inserted: result.inserted,
      skipped: result.skipped,
      by: user.id,
    },
    'Stock added'
  )

  return result
}

/** List inventory items — admin only. */
export async function listForAdmin(
  input: ListInventoryInput,
  user: Pick<User, 'role'>
): Promise<ListInventoryResult> {
  if (!isAdmin(user)) {
    throw new ForbiddenError('Chỉ admin mới xem kho')
  }

  const where = buildWhere(input)
  const skip = (input.page - 1) * input.limit
  const { items, total } = await repo.list(where, skip, input.limit)

  const viewItems: InventoryItemView[] = items.map((it) => ({
    id: it.id,
    batchId: it.batchId,
    productId: it.productId,
    variantId: it.variantId,
    fingerprint: it.fingerprint,
    status: it.status as InventoryItemView['status'],
    reservedForOrderId: it.reservedForOrderId,
    reservedAt: it.reservedAt ? it.reservedAt.toISOString() : null,
    deliveredAt: it.deliveredAt ? it.deliveredAt.toISOString() : null,
    returnedAt: it.returnedAt ? it.returnedAt.toISOString() : null,
    expiresAt: it.expiresAt ? it.expiresAt.toISOString() : null,
    metadata: (it.metadata as Record<string, unknown> | null) ?? null,
    createdAt: it.createdAt.toISOString(),
  }))

  return {
    items: viewItems,
    page: input.page,
    limit: input.limit,
    total,
    hasMore: input.page * input.limit < total,
  }
}

function buildWhere(input: ListInventoryInput) {
  const where: Parameters<typeof repo.list>[0] = {}
  if (input.status) where.status = input.status
  if (input.productId) where.productId = input.productId
  if (input.variantId) where.variantId = input.variantId
  if (input.fingerprint) where.fingerprint = { contains: input.fingerprint }
  return where
}

/** Search by fingerprint — admin only. Returns raw items (admin tool). */
export async function searchByFingerprintAdmin(
  fingerprint: string,
  user: Pick<User, 'role'>
) {
  if (!isAdmin(user)) {
    throw new ForbiddenError('Chỉ admin mới search fingerprint')
  }
  if (fingerprint.length < 4) {
    throw new ValidationError('Fingerprint phải ≥ 4 ký tự')
  }
  return repo.searchByFingerprint(fingerprint)
}

/**
 * Reserve 1 key cho order — internal, gọi từ delivery service.
 *
 * - Throw OutOfStockError nếu không còn.
 */
export async function reserveKey(productId: string, variantId: string | null, orderId: string) {
  return repo.reserveOne(productId, variantId, orderId)
}

/**
 * Reserve a specific item — admin manual pick (Phase 3 P3-05 deliver flow).
 */
export async function reserveSpecificItem(itemId: string, orderId: string) {
  return repo.reserveSpecific(itemId, orderId)
}

/** Mark delivered — internal. */
export async function markDelivered(itemId: string) {
  return repo.markDelivered(itemId)
}

/** Return to stock — internal, gọi khi cancel trước delivered. */
export async function returnToStock(itemId: string) {
  return repo.returnToStock(itemId)
}

/** Count available — internal. */
export async function countAvailable(productId: string, variantId: string | null) {
  return repo.countAvailable(productId, variantId)
}

/**
 * List batches — admin. Phase 3 chỉ cần cho addStock UI summary.
 */
export async function listBatchesForAdmin(productId: string, user: Pick<User, 'role'>): Promise<InventoryBatchView[]> {
  if (!isAdmin(user)) throw new ForbiddenError('Chỉ admin')

  const batches = await db.inventoryBatch.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
  })

  const counts = await db.inventoryItem.groupBy({
    by: ['batchId', 'status'],
    where: { batchId: { in: batches.map((b) => b.id) } },
    _count: true,
  })

  const countsMap = new Map<string, Record<string, number>>()
  for (const row of counts) {
    if (!countsMap.has(row.batchId)) countsMap.set(row.batchId, {})
    countsMap.get(row.batchId)![row.status] = row._count
  }

  return batches.map((b) => {
    const c = countsMap.get(b.id) ?? {}
    return {
      id: b.id,
      productId: b.productId,
      variantId: b.variantId,
      source: b.source,
      importedBy: b.importedBy,
      note: b.note,
      itemCount: b._count.items,
      availableCount: c.available ?? 0,
      reservedCount: c.reserved ?? 0,
      deliveredCount: c.delivered ?? 0,
      createdAt: b.createdAt.toISOString(),
    }
  })
}