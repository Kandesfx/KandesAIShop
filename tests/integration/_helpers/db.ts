/**
 * DB helpers cho integration tests — Phase 2 P2-06.
 *
 * ⚠️ Test dùng DATABASE_URL của `.env.test` (config qua vitest.setup.ts).
 *
 * Strategy:
 *   - beforeAll(): cleanupAll() — xoá data theo thứ tự FK ngược.
 *   - Seed minimal fixtures (1 category, 1 product, 1 variant, 1 inventory batch).
 *
 * KHÔNG chạy song song với dev server khi dùng cùng DB — vì deleteAll()
 * sẽ xoá data thật.
 */

import { db } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { hashPassword } from '@/lib/password'

/**
 * Xoá data theo thứ tự FK ngược — order child tables trước.
 * Throw nếu FK khác thiếu (Prisma báo rõ FK vi phạm).
 */
export async function cleanupAll(): Promise<void> {
  await db.orderStatusHistory.deleteMany()
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.cartItem.deleteMany()
  await db.cart.deleteMany()
  await db.inventoryItem.deleteMany()
  await db.inventoryBatch.deleteMany()
  await db.productVariant.deleteMany()
  await db.productAttribute.deleteMany()
  await db.productMedia.deleteMany()
  await db.product.deleteMany()
  await db.category.deleteMany()
  await db.review.deleteMany()
  await db.coupon.deleteMany()
  await db.session.deleteMany()
  await db.user.deleteMany()
  await db.setting.deleteMany()
}

/**
 * Tạo minimal seed: 1 admin user (cho InventoryBatch.importedBy FK),
 * 1 category, 1 product (published), 1 variant, 1 inventory batch
 * với 5 key đã encrypt.
 */
export async function seedMinimal(): Promise<{
  categoryId: string
  productId: string
  variantId: string
  batchId: string
}> {
  // Tạo test admin trước để dùng làm importedBy
  const adminHash = await hashPassword('Admin1234!')
  const admin = await db.user.create({
    data: {
      email: 'seed-admin@test.local',
      passwordHash: adminHash,
      name: 'Seed Admin',
      role: 'admin',
      status: 'active',
    },
  })

  const category = await db.category.create({
    data: {
      slug: 'test-cat',
      name: 'Test Category',
      description: 'Integration test category',
    },
  })

  const product = await db.product.create({
    data: {
      slug: 'test-product',
      name: 'Test Product',
      sku: 'TEST-SKU-001',
      description: 'Integration test product',
      shortDescription: 'Test',
      priceCents: BigInt(100000),
      currency: 'VND',
      stockStatus: 'in_stock',
      categoryId: category.id,
      deliveryStrategy: 'INSTANT_AUTO',
      isPublished: true,
    },
  })

  const variant = await db.productVariant.create({
    data: {
      productId: product.id,
      sku: 'TEST-SKU-001-V1',
      name: '1 tháng',
      priceCents: BigInt(100000),
      position: 1,
    },
  })

  const batch = await db.inventoryBatch.create({
    data: {
      productId: product.id,
      variantId: variant.id,
      source: 'manual',
      importedBy: admin.id,
      note: 'Test batch',
    },
  })

  // 5 encrypted keys
  for (let i = 0; i < 5; i++) {
    const value = `TEST-KEY-${i.toString().padStart(4, '0')}`
    await db.inventoryItem.create({
      data: {
        batchId: batch.id,
        productId: product.id,
        variantId: variant.id,
        fingerprint: `fp-${i}`,
        valueEncrypted: encrypt(value),
        status: 'available',
      },
    })
  }

  return {
    categoryId: category.id,
    productId: product.id,
    variantId: variant.id,
    batchId: batch.id,
  }
}

/**
 * Tạo customer user với password hash đã biết.
 */
export async function seedUser(opts?: {
  email?: string
  password?: string
  name?: string
}): Promise<{ id: string; email: string; passwordHash: string; password: string }> {
  const password = opts?.password ?? 'Test1234!'
  const hash = await hashPassword(password)
  const user = await db.user.create({
    data: {
      email: opts?.email ?? 'test-user@example.com',
      passwordHash: hash,
      name: opts?.name ?? 'Test User',
      role: 'customer',
      status: 'active',
    },
  })
  // Schema: email là nullable, nhưng seed luôn truyền email → cast safe.
  return {
    id: user.id,
    email: user.email ?? opts?.email ?? 'test-user@example.com',
    passwordHash: hash,
    password,
  }
}

/**
 * Tạo admin user (nếu test cần).
 */
export async function seedAdmin(opts?: {
  email?: string
}): Promise<{ id: string; email: string }> {
  const password = 'Admin1234!'
  const hash = await hashPassword(password)
  const email = opts?.email ?? 'test-admin@example.com'
  const user = await db.user.create({
    data: {
      email,
      passwordHash: hash,
      name: 'Test Admin',
      role: 'admin',
      status: 'active',
    },
  })
  return { id: user.id, email }
}