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
 */
export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-h1 font-display text-ink-50">GIỎ HÀNG</h1>
        <CartPageHeader />
      </header>
      <CartPageClient />
    </div>
  )
}
