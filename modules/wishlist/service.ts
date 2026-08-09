import { NotFoundError } from '@/lib/errors'
import { wishlistRepository } from './repository'
import { db } from '@/lib/db'
import type { WishlistItemView, AddWishlistInput } from './types'

/**
 * Wishlist service — Phase 9 D3 "Lưu lại sau".
 *
 * Chỉ hỗ trợ user đã đăng nhập (guest không có nơi lưu lâu dài). Route
 * handler phải requireUser() trước khi gọi service này.
 */
function toView(item: {
  id: string
  productId: string
  variantId: string | null
  createdAt: Date
  product: {
    slug: string
    name: string
    priceCents: bigint
    salePriceCents: bigint | null
    isPublished: boolean
    deletedAt: Date | null
    media: { url: string }[]
  }
  variant: {
    name: string
    priceCents: bigint
    salePriceCents: bigint | null
    isActive: boolean
  } | null
}): WishlistItemView {
  const unitPriceCents = item.variant
    ? item.variant.salePriceCents ?? item.variant.priceCents
    : item.product.salePriceCents ?? item.product.priceCents

  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productSlug: item.product.slug,
    productName: item.product.name,
    productImage: item.product.media[0]?.url ?? null,
    variantName: item.variant?.name ?? null,
    unitPriceCents: unitPriceCents.toString(),
    isPublished: item.product.isPublished && !item.product.deletedAt && (item.variant?.isActive ?? true),
    createdAt: item.createdAt.toISOString(),
  }
}

export const wishlistService = {
  /**
   * Thêm sản phẩm vào wishlist. Idempotent — nếu đã có rồi thì trả về
   * item hiện tại thay vì throw lỗi (UI là toggle button, không cần báo
   * lỗi trùng lặp).
   */
  async addToWishlist(userId: string, input: AddWishlistInput): Promise<{ id: string }> {
    const variantId = input.variantId ?? null

    const product = await db.product.findUnique({
      where: { id: input.productId },
      select: { id: true, isPublished: true, deletedAt: true },
    })
    if (!product || !product.isPublished || product.deletedAt) {
      throw new NotFoundError('Sản phẩm không tồn tại hoặc đã ngừng bán')
    }

    if (variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, productId: true },
      })
      if (!variant || variant.productId !== product.id) {
        throw new NotFoundError('Variant không tồn tại')
      }
    }

    const existing = await wishlistRepository.findByUserAndProduct(userId, input.productId, variantId)
    if (existing) {
      return { id: existing.id }
    }

    const created = await wishlistRepository.create({
      userId,
      productId: input.productId,
      variantId,
    })
    return { id: created.id }
  },

  /** Xoá 1 item khỏi wishlist theo id. Kiểm tra quyền sở hữu. */
  async removeFromWishlist(userId: string, id: string): Promise<void> {
    const item = await wishlistRepository.findById(id)
    if (!item || item.userId !== userId) {
      throw new NotFoundError('Item không tồn tại trong wishlist')
    }
    await wishlistRepository.delete(id)
  },

  /** Xoá theo productId + variantId (dùng cho toggle button trên PDP/cart). */
  async removeByProduct(userId: string, productId: string, variantId?: string | null): Promise<void> {
    await wishlistRepository.deleteByUserAndProduct(userId, productId, variantId ?? null)
  },

  async listWishlist(userId: string): Promise<WishlistItemView[]> {
    const items = await wishlistRepository.listByUser(userId)
    return items.map(toView)
  },
}