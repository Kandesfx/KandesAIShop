import { CartPageClient } from '@/components/cart/cart-page-client'
import { cartService } from '@/modules/cart'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Giỏ hàng · Kandes.shop',
  description: 'Xem và chỉnh sửa giỏ hàng của bạn',
}

/**
 * /cart — full-page cart view.
 *
 * Server-render initial cart → truyền cho client component để handle
 * updates real-time. Lazy create cart (user hoặc guest).
 *
 * GRACEFUL DEGRADATION: DB down → inline error state.
 */
export default async function CartPage() {
  let user = null
  let cart = null

  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }

  try {
    cart = await cartService.getCurrentCart(user?.id ?? null)
  } catch {
    cart = null
  }

  if (!cart) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-6">
          <h1 className="text-h1 font-display text-ink-50">GIỎ HÀNG</h1>
        </header>
        <div className="text-center py-16 space-y-4">
          <p className="text-h3 text-ink-100">Không thể tải giỏ hàng</p>
          <p className="text-ink-300 text-body">
            Hệ thống đang bận. Vui lòng làm mới trang hoặc thử lại sau.
          </p>
          <a href="/cart" className="btn-primary">
          LÀM MỚI
        </a>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-h1 font-display text-ink-50">GIỎ HÀNG</h1>
        <p className="text-ink-300 mt-1">
          {cart.itemCount > 0
            ? `Bạn đang có ${cart.itemCount} sản phẩm trong giỏ`
            : 'Giỏ hàng của bạn đang trống'}
        </p>
      </header>

      <CartPageClient initialCart={cart} />
    </div>
  )
}
