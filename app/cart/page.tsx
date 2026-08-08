import { CartPageClient } from '@/components/cart/cart-page-client'
import { CartPageHeader } from '@/components/cart/cart-page-header'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Giỏ hàng · Kandes.shop',
  description: 'Xem và chỉnh sửa giỏ hàng của bạn',
}

/**
 * /cart — full-page cart view.
 *
 * CartPageClient đọc cart từ CartProvider (single source of truth).
 * CartProvider được mount ở app/layout.tsx với initial cart server-side.
 *
 * searchParams.error=cart_load_failed → banner cảnh báo (A4): khi /checkout
 * gặp lỗi DB load cart, nó redirect về đây kèm context thay vì im lặng.
 */
export default function CartPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const loadFailed = searchParams.error === 'cart_load_failed'

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-h1 font-display text-ink-50">GIỎ HÀNG</h1>
        <CartPageHeader />
      </header>
      {loadFailed && (
        <div
          role="alert"
          className="mb-6 border border-danger/40 bg-danger/10 text-danger text-body-sm p-3"
        >
          Không tải được giỏ hàng để thanh toán, vui lòng thử lại.
        </div>
      )}
      <CartPageClient />
    </div>
  )
}
