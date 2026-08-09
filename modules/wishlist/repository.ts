import { db } from '@/lib/db'

/**
 * Wishlist repository — Phase 9 D3.
 *
 * Composite unique (userId, productId, variantId) ở schema đảm bảo không
 * trùng lặp. Prisma không hỗ trợ upsert với nullable field trong composite
 * key một cách trực tiếp nên dùng findFirst + create giống pattern của
 * cart/service.ts (mergeOneItem).
 */
export const wishlistRepository = {
  async findByUserAndProduct(userId: string, productId: string, variantId: string | null) {
    return db.wishlist.findFirst({
      where: { userId, productId, variantId },
    })
  },

  async create(data: { userId: string; productId: string; variantId: string | null }) {
    return db.wishlist.create({
      data: {
        userId: data.userId,
        productId: data.productId,
        variantId: data.variantId,
      },
    })
  },

  async listByUser(userId: string) {
    return db.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            priceCents: true,
            salePriceCents: true,
            isPublished: true,
            deletedAt: true,
            media: {
              where: { type: 'image' },
              orderBy: { position: 'asc' },
              take: 1,
              select: { url: true },
            },
          },
        },
        variant: {
          select: { name: true, priceCents: true, salePriceCents: true, isActive: true },
        },
      },
    })
  },

  async findById(id: string) {
    return db.wishlist.findUnique({ where: { id } })
  },

  async delete(id: string) {
    return db.wishlist.delete({ where: { id } })
  },

  async deleteByUserAndProduct(userId: string, productId: string, variantId: string | null) {
    return db.wishlist.deleteMany({
      where: { userId, productId, variantId },
    })
  },
}