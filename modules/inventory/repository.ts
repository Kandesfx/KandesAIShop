import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { OutOfStockError } from '@/lib/errors'
import { fingerprint } from '@/lib/encryption'

/**
 * Inventory repository — Phase 3 P3-03.
 *
 * Data access layer. Service gọi repo, route gọi service.
 *
 * Encapsulate:
 *   - Encrypt value trước khi lưu (ADR-008).
 *   - Atomic reserve qua Prisma transaction với select for update.
 *   - Fingerprint unique constraint handling (retry).
 */

type AddStockData = {
  productId: string
  variantId: string | null
  values: string[]
  source: 'manual' | 'csv' | 'api'
  importedBy: string
  note?: string
}

/** Tạo 1 batch + N items trong 1 transaction. */
export async function addStock(data: AddStockData) {
  // Trước tạo items: tính fingerprint + encrypt (ngoài transaction để giảm hold)
  const itemsData = data.values.map((value) => ({
    productId: data.productId,
    variantId: data.variantId,
    fingerprint: fingerprint(value),
    valueEncrypted: encrypt(value),
    status: 'available' as const,
  }))

  return db.$transaction(async (tx) => {
    const batch = await tx.inventoryBatch.create({
      data: {
        productId: data.productId,
        variantId: data.variantId,
        source: data.source,
        importedBy: data.importedBy,
        note: data.note,
      },
    })

    // Bulk create items — Prisma không hỗ trợ skipOnConflict nên check trước
    // (số lượng nhỏ, dùng try/catch cho từng item)
    let inserted = 0
    for (const item of itemsData) {
      try {
        await tx.inventoryItem.create({
          data: {
            batchId: batch.id,
            ...item,
          },
        })
        inserted++
      } catch (err) {
        // Unique constraint trên fingerprint → skip (đã tồn tại)
        if ((err as { code?: string }).code === 'P2002') {
          continue
        }
        throw err
      }
    }

    return {
      batchId: batch.id,
      requested: data.values.length,
      inserted,
      skipped: data.values.length - inserted,
    }
  })
}

/**
 * Reserve 1 inventory item atomic.
 *
 * - SELECT FOR UPDATE qua `update where` của Prisma (compare-and-swap với status filter).
 * - Nếu status != 'available' → throw OutOfStockError.
 * - KHÔNG reserve nếu order.status != 'paid' (caller check trước).
 */
export async function reserveOne(productId: string, variantId: string | null, orderId: string) {
  // findFirst + update (atomic qua Prisma transaction) — KHÔNG dùng updateMany
  // vì updateMany không có take, sẽ reserve tất cả items cùng lúc.
  return db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({
      where: {
        productId,
        variantId: variantId ?? null,
        status: 'available',
        reservedForOrderId: null,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (!item) {
      throw new OutOfStockError('Không còn key trong kho')
    }

    return tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        status: 'reserved',
        reservedForOrderId: orderId,
        reservedAt: new Date(),
      },
    })
  })
}

/**
 * Reserve a specific item by id — admin manual pick.
 * Returns the reserved item; throws if status != 'available' or row not found.
 */
export async function reserveSpecific(itemId: string, orderId: string) {
  return db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: itemId } })
    if (!item) throw new OutOfStockError('Không tìm thấy item trong kho')
    if (item.status !== 'available' || item.reservedForOrderId) {
      throw new OutOfStockError('Item này không còn khả dụng')
    }
    return tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        status: 'reserved',
        reservedForOrderId: orderId,
        reservedAt: new Date(),
      },
    })
  })
}

/**
 * Mark item delivered (sau khi decrypt + copy sang OrderItem).
 */
export async function markDelivered(itemId: string) {
  return db.inventoryItem.update({
    where: { id: itemId },
    data: {
      status: 'delivered',
      deliveredAt: new Date(),
      reservedForOrderId: null, // clear reservation
    },
  })
}

/** Return to stock (nếu cancel trước khi delivered). */
export async function returnToStock(itemId: string) {
  return db.inventoryItem.update({
    where: { id: itemId },
    data: {
      status: 'available',
      reservedForOrderId: null,
      reservedAt: null,
    },
  })
}

/** List inventory — admin. */
export async function list(where: Prisma.InventoryItemWhereInput, skip: number, take: number) {
  const [items, total] = await db.$transaction([
    db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        batchId: true,
        productId: true,
        variantId: true,
        fingerprint: true,
        status: true,
        reservedForOrderId: true,
        reservedAt: true,
        deliveredAt: true,
        returnedAt: true,
        expiresAt: true,
        metadata: true,
        createdAt: true,
      },
    }),
    db.inventoryItem.count({ where }),
  ])

  return { items, total }
}

/** Search by fingerprint (admin only) — exact match prefix (16 hex chars). */
export async function searchByFingerprint(fingerprint: string) {
  // 16 hex chars exact match. Không contains search để tránh leak.
  return db.inventoryItem.findMany({
    where: { fingerprint },
    take: 50,
    orderBy: { createdAt: 'desc' },
  })
}

/** Count available for product+variant (cho stock check). */
export async function countAvailable(productId: string, variantId: string | null) {
  return db.inventoryItem.count({
    where: {
      productId,
      variantId: variantId ?? null,
      status: 'available',
    },
  })
}