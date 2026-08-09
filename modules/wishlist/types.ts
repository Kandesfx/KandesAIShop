/**
 * Public types cho wishlist module (Phase 9 D3 — "Lưu lại sau").
 *
 * WishlistItemView đã denormalize product info để UI không cần query thêm,
 * cùng convention với CartItemView.
 */

export type WishlistItemView = {
  id: string
  productId: string
  variantId: string | null
  productSlug: string
  productName: string
  productImage: string | null
  variantName: string | null
  unitPriceCents: string // BigInt -> string cho JSON
  isPublished: boolean
  createdAt: string
}

export type AddWishlistInput = {
  productId: string
  variantId?: string | null
}