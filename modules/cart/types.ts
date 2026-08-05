/**
 * Public types cho cart module.
 *
 * CartView là shape trả về cho client — đã denormalize product info để UI
 * không phải query thêm.
 */

export type CartItemView = {
  id: string
  productId: string
  variantId: string | null
  productSlug: string
  productName: string
  productImage: string | null
  variantName: string | null
  unitPriceCents: string // BigInt → string cho JSON
  quantity: number
  lineTotalCents: string
}

export type CartView = {
  id: string
  type: 'user' | 'guest'
  items: CartItemView[]
  itemCount: number
  subtotalCents: string
  discountCents: string
  totalCents: string
  couponCode: string | null
}
