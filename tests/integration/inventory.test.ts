/**
 * Inventory Module E2E — Phase 3 P3-03.
 *
 * Verify:
 *   - addStock: insert batch + items với encryption + fingerprint.
 *   - reserveKey atomic: chỉ 1 caller được 1 item (race condition handled via Prisma WHERE).
 *   - markDelivered / returnToStock transitions.
 *   - listForAdmin: filter + pagination.
 *   - searchByFingerprint: contains match.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { cleanupAll, seedMinimal } from './_helpers/db'
import { addStock, listForAdmin, searchByFingerprintAdmin, countAvailable } from '@/modules/inventory'
import { decrypt, fingerprint } from '@/lib/encryption'

describe('Inventory Module — Integration (P3-03)', () => {
  let fixtures: Awaited<ReturnType<typeof seedMinimal>>
  const adminUser = { id: '__admin_id__', role: 'admin' as const }
  const customerUser = { id: '__customer_id__', role: 'customer' as const }

  beforeAll(async () => {
    await cleanupAll()
    fixtures = await seedMinimal()
  })

  afterAll(async () => {
    await cleanupAll()
    await db.$disconnect()
  })

  beforeEach(async () => {
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.inventoryItem.deleteMany()
    await db.inventoryBatch.deleteMany()
  })

  describe('addStock', () => {
    it('OK: 1 batch + 3 items + encrypted', async () => {
      const values = ['KEY-001', 'KEY-002', 'KEY-003']
      const result = await addStock(
        {
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          values,
          note: 'Test batch',
        },
        adminUser
      )

      expect(result.batchId).toBeTruthy()
      expect(result.requested).toBe(3)
      expect(result.inserted).toBe(3)
      expect(result.skipped).toBe(0)

      const items = await db.inventoryItem.findMany({
        where: { batchId: result.batchId },
      })
      expect(items.length).toBe(3)

      // Verify encryption + fingerprint
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!
        const decrypted = decrypt(Buffer.from(item.valueEncrypted))
        expect(decrypted).toBe(values[i])
        expect(item.fingerprint).toBe(fingerprint(values[i]!))
        expect(item.status).toBe('available')
      }
    })

    it('dedupe: add 2 lần cùng value → chỉ insert 1', async () => {
      const values = ['DUPE-KEY']
      const first = await addStock(
        { productId: fixtures.productId, variantId: fixtures.variantId, values },
        adminUser
      )
      const second = await addStock(
        { productId: fixtures.productId, variantId: fixtures.variantId, values },
        adminUser
      )

      expect(first.inserted).toBe(1)
      expect(second.inserted).toBe(0)
      expect(second.skipped).toBe(1)
    })

    it('reject customer role', async () => {
      await expect(
        addStock(
          { productId: fixtures.productId, variantId: fixtures.variantId, values: ['x'] },
          customerUser
        )
      ).rejects.toThrow(/Chỉ admin/)
    })

    it('reject nếu product không tồn tại', async () => {
      await expect(
        addStock(
          {
            productId: '00000000-0000-0000-0000-000000000000',
            variantId: fixtures.variantId,
            values: ['x'],
          },
          adminUser
        )
      ).rejects.toThrow(/Sản phẩm không tồn tại/)
    })
  })

  describe('reserveKey', () => {
    it('reserve 1 key atomic — first call wins', async () => {
      await addStock(
        {
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          values: ['RES-KEY-A', 'RES-KEY-B'],
        },
        adminUser
      )

      const { reserveKey } = await import('@/modules/inventory/service')
      const orderId = 'order-1'
      const item = await reserveKey(fixtures.productId, fixtures.variantId, orderId)
      expect(item.status).toBe('reserved')
      expect(item.reservedForOrderId).toBe(orderId)
      expect(item.reservedAt).not.toBeNull()

      // Second call: only 1 left
      const item2 = await reserveKey(fixtures.productId, fixtures.variantId, 'order-2')
      expect(item2.id).not.toBe(item.id)

      // Third call: out of stock
      await expect(
        reserveKey(fixtures.productId, fixtures.variantId, 'order-3')
      ).rejects.toThrow(/Không còn key/)
    })

    it('countAvailable', async () => {
      await addStock(
        {
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          values: ['COUNT-1', 'COUNT-2', 'COUNT-3'],
        },
        adminUser
      )
      expect(await countAvailable(fixtures.productId, fixtures.variantId)).toBe(3)

      const { reserveKey } = await import('@/modules/inventory/service')
      await reserveKey(fixtures.productId, fixtures.variantId, 'order-x')
      expect(await countAvailable(fixtures.productId, fixtures.variantId)).toBe(2)
    })
  })

  describe('markDelivered + returnToStock', () => {
    it('markDelivered transition reserved → delivered, clear reservation', async () => {
      await addStock(
        {
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          values: ['DEL-KEY-1'],
        },
        adminUser
      )
      const { reserveKey, markDelivered } = await import('@/modules/inventory/service')
      const item = await reserveKey(fixtures.productId, fixtures.variantId, 'order-d1')
      await markDelivered(item.id)

      const after = await db.inventoryItem.findUnique({ where: { id: item.id } })
      expect(after!.status).toBe('delivered')
      expect(after!.deliveredAt).not.toBeNull()
      expect(after!.reservedForOrderId).toBeNull()
    })

    it('returnToStock: reserved → available (cancel trước delivered)', async () => {
      await addStock(
        {
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          values: ['RETURN-1'],
        },
        adminUser
      )
      const { reserveKey, returnToStock } = await import('@/modules/inventory/service')
      const item = await reserveKey(fixtures.productId, fixtures.variantId, 'order-r1')
      await returnToStock(item.id)

      const after = await db.inventoryItem.findUnique({ where: { id: item.id } })
      expect(after!.status).toBe('available')
      expect(after!.reservedForOrderId).toBeNull()
    })
  })

  describe('listForAdmin', () => {
    beforeEach(async () => {
      await addStock(
        {
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          values: ['LIST-1', 'LIST-2', 'LIST-3'],
        },
        adminUser
      )
    })

    it('OK: pagination + total', async () => {
      const result = await listForAdmin(
        { status: 'available', page: 1, limit: 10 },
        adminUser
      )
      expect(result.total).toBe(3)
      expect(result.items.length).toBe(3)
      expect(result.hasMore).toBe(false)
    })

    it('OK: pagination page=2 limit=2', async () => {
      const result = await listForAdmin(
        { page: 2, limit: 2 },
        adminUser
      )
      expect(result.items.length).toBe(1)
      expect(result.hasMore).toBe(false)
      expect(result.total).toBe(3)
    })

    it('filter theo productId', async () => {
      const result = await listForAdmin(
        { productId: fixtures.productId, page: 1, limit: 50 },
        adminUser
      )
      expect(result.items.length).toBe(3)
    })

    it('reject customer', async () => {
      await expect(
        listForAdmin({ page: 1, limit: 10 }, customerUser)
      ).rejects.toThrow(/Chỉ admin/)
    })
  })

  describe('searchByFingerprintAdmin', () => {
    it('match exact fingerprint', async () => {
      const values = ['A-FP-SEARCH-1', 'A-FP-SEARCH-2']
      await addStock(
        {
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          values,
        },
        adminUser
      )
      // Lấy fingerprint thật của 1 item
      const item = await db.inventoryItem.findFirst({
        where: { fingerprint: { startsWith: (await import('@/lib/encryption')).fingerprint('A-FP-SEARCH-1').slice(0, 8) } },
      })
      expect(item).not.toBeNull()
      const fullFp = (await import('@/lib/encryption')).fingerprint('A-FP-SEARCH-1')
      // exact match (16 hex)
      const results = await searchByFingerprintAdmin(fullFp, adminUser)
      expect(results.length).toBeGreaterThanOrEqual(1)
    })

    it('reject fingerprint < 4 chars', async () => {
      await expect(
        searchByFingerprintAdmin('abc', adminUser)
      ).rejects.toThrow(/Fingerprint/)
    })

    it('reject customer', async () => {
      await expect(
        searchByFingerprintAdmin('abcd', customerUser)
      ).rejects.toThrow(/Chỉ admin/)
    })
  })
})