import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { cartService } from '@/modules/cart'
import { db } from '@/lib/db'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { CheckoutTimeline } from '@/components/checkout/checkout-timeline'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/lib/format'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Thanh toán · Kandes.shop',
  description: 'Hoàn tất đơn hàng của bạn',
}

/**
 * /checkout — Phase 2 P2-07.
 *
 * Server-side:
 *   - Load cart (lazy create nếu guest).
 *   - Nếu trống → redirect về /cart.
 *   - Pre-fill email/phone nếu user đã login (lookup User).
 *   - Render CheckoutForm (client) + summary giỏ.
 *
 * GRACEFUL DEGRADATION: DB down → redirect về /cart với thông báo.
 */
export default async function CheckoutPage() {
  let user = null
  let cart = null
  let userPhone = ''

  try {
    user = await getCurrentUser()
  } catch {
    // getCurrentUser throw khi DB down → treat as guest
    user = null
  }

  try {
    cart = await cartService.getCurrentCart(user?.id ?? null)
  } catch {
    // DB/cart error → redirect về cart page kèm context để hiển thị banner
    redirect('/cart?error=cart_load_failed')
  }

  if (!cart || cart.items.length === 0) {
    redirect('/cart')
  }

  // Lookup thêm phone từ DB nếu user
  if (user) {
    try {
      const u = await db.user.findUnique({
        where: { id: user.id },
        select: { phone: true, email: true },
      })
      userPhone = u?.phone ?? ''
    } catch {
      userPhone = ''
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <header className="mb-6 pb-6 border-b border-ink-400 space-y-2">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-ink-200 hover:text-electric text-body-sm"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden />
          Quay lại giỏ hàng
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric block">
          [ CHECKOUT · THANH TOÁN ]
        </span>
        <h1 className="text-h1 font-display text-ink-50">Hoàn tất đơn hàng</h1>
        <p className="text-ink-300 text-body">
          {user ? 'Đăng nhập với tư cách khách hàng' : 'Mua với tư cách khách'} · {cart.itemCount}{' '}
          sản phẩm
        </p>
        <CheckoutTimeline current="payment" className="pt-2" />
      </header>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <section>
          <div className="mb-6 pb-6 border-b border-ink-400 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
              [ 01 / THÔNG TIN LIÊN HỆ ]
            </span>
            <h2 className="text-h3 font-display text-ink-50">Thông tin liên hệ</h2>
          </div>
          <CheckoutForm
            defaultEmail={user?.email ?? ''}
            defaultPhone={userPhone}
            isGuest={!user}
          />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className="border border-ink-700 bg-ink-900 p-4 space-y-3">
            <h3 className="text-h4 text-ink-50 font-display">TÓM TẮT ĐƠN</h3>

            <ul className="space-y-2 text-body-sm">
              {cart.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-3 py-1.5 border-b border-ink-800 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-ink-50 line-clamp-2 leading-tight">{it.productName}</p>
                    {it.variantName && (
                      <p className="text-ink-300 text-body-xs mt-0.5">{it.variantName}</p>
                    )}
                    <p className="text-ink-300 text-body-xs mt-0.5 font-mono">
                      × {it.quantity} · {formatVnd(it.unitPriceCents)}
                    </p>
                  </div>
                  <span className="text-ink-100 tabular-nums flex-shrink-0">
                    {formatVnd(it.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5 text-body-sm pt-2 border-t border-ink-700">
              <div className="flex items-center justify-between">
                <span className="text-ink-200">Tạm tính</span>
                <span className="tabular-nums text-ink-100">{formatVnd(cart.subtotalCents)}</span>
              </div>
              {cart.couponCode && (
                <div className="flex items-center justify-between">
                  <span className="text-success">Giảm giá ({cart.couponCode})</span>
                  <span className="tabular-nums text-success">
                    -{formatVnd(cart.discountCents)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-ink-800">
                <span className="text-ink-50 font-semibold">Tổng thanh toán</span>
                <span className="text-h4 text-electric font-bold tabular-nums">
                  {formatVnd(cart.totalCents)}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-ink-700 bg-ink-900 p-4 text-body-xs text-ink-300 space-y-2">
            <p className="text-ink-100 font-semibold">PHƯƠNG THỨC</p>
            <p>
              Thanh toán qua <span className="text-electric font-mono">QR VietQR</span> — quét bằng
              app ngân hàng. Đơn tự động xác thực sau khi nhận tiền.
            </p>
            <p className="pt-2 border-t border-ink-700">
              Sản phẩm số sẽ được tự động kích hoạt và gửi qua email / trang đơn hàng ngay sau khi nhận thanh toán thành công, hoặc cấp trực tiếp bởi đội ngũ hỗ trợ.
            </p>
          </div>

          <Link href="/cart" className="block">
            <Button variant="outline" size="sm" className="w-full">
              SỬA GIỎ HÀNG
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  )
}
