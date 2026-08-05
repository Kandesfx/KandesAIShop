'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { api, ApiError } from '@/lib/api-client'
import { CartItemRow } from '@/components/cart/cart-item'
import { formatVnd } from '@/lib/format'
import type { CartView } from '@/modules/cart'

export interface CartPageClientProps {
  initialCart: CartView
}

/**
 * Client-side cart page body. Update qty / remove / clear tất cả real-time.
 * Cart ban đầu fetch server-side trong page.tsx.
 */
export function CartPageClient({ initialCart }: CartPageClientProps) {
  const [cart, setCart] = useState<CartView>(initialCart)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const handleChange = async (itemId: string, qty: number) => {
    setBusyId(itemId)
    setErr(null)
    try {
      const res = await api.patch<{ cart: CartView }>(`/api/cart/items/${itemId}`, {
        quantity: qty,
      })
      setCart(res.cart)
    } catch (e) {
      setErr((e as ApiError).message)
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (itemId: string) => {
    setBusyId(itemId)
    setErr(null)
    try {
      const res = await api.delete<{ cart: CartView }>(`/api/cart/items/${itemId}`)
      setCart(res.cart)
    } catch (e) {
      setErr((e as ApiError).message)
    } finally {
      setBusyId(null)
    }
  }

  // F7: dùng endpoint /api/cart/clear (1 request) thay vì loop DELETE
  const handleClear = async () => {
    setConfirmClear(false)
    setClearing(true)
    setErr(null)
    try {
      const res = await api.post<{ cart: CartView }>('/api/cart/clear', {})
      setCart(res.cart)
    } catch (e) {
      setErr((e as ApiError).message)
    } finally {
      setClearing(false)
    }
  }

  // F10: coupon UI disabled — sẽ có ở P2-07 (Checkout)
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    // No-op cho tới khi P2-07 hoàn tất
    void couponInput
  }

  if (cart.items.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-h3 text-ink-100">Giỏ hàng trống</p>
        <p className="text-ink-300 text-body">Khám phá các sản phẩm và thêm vào giỏ để tiếp tục.</p>
        <Link href="/products">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            KHÁM PHÁ NGAY
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <section className="space-y-3">
        {err && (
          <div
            role="alert"
            className="border border-danger/40 bg-danger/10 text-danger text-body-sm p-2.5"
          >
            {err}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-ink-50">
            Sản phẩm <span className="text-ink-400 text-body-sm">({cart.itemCount})</span>
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClear(true)}
            disabled={clearing}
            leftIcon={<Trash2 size={12} />}
          >
            XOÁ TẤT CẢ
          </Button>
        </div>

        <div className="space-y-2">
          {cart.items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onChange={handleChange}
              onRemove={handleRemove}
              busy={busyId === item.id}
            />
          ))}
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-4 self-start">
        <div className="border border-ink-700 bg-ink-900 p-4 space-y-3">
          <h3 className="text-h4 text-ink-50 font-display">TÓM TẮT</h3>

          <div className="space-y-2 text-body-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-200">Tạm tính</span>
              <span className="tabular-nums text-ink-100">{formatVnd(cart.subtotalCents)}</span>
            </div>
            {cart.couponCode && (
              <div className="flex items-center justify-between">
                <span className="text-success">Giảm giá ({cart.couponCode})</span>
                <span className="tabular-nums text-success">-{formatVnd(cart.discountCents)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-ink-800 pt-2">
              <span className="text-ink-50 font-semibold">Tổng</span>
              <span className="text-h4 text-electric font-bold tabular-nums">
                {formatVnd(cart.totalCents)}
              </span>
            </div>
          </div>

          {/* F10: coupon UI hiện disabled + hint rõ ràng */}
          <form onSubmit={handleApplyCoupon} className="space-y-2 pt-2">
            <Input
              label="MÃ GIẢM GIÁ"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Sẽ có ở P2-07"
              disabled
              className="font-mono"
              hint="Tính năng áp dụng mã giảm giá đang được phát triển ở P2-07."
            />
            <Button type="submit" variant="outline" size="md" className="w-full" disabled>
              ÁP DỤNG
            </Button>
          </form>

          <Link href="/checkout" className="block pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              rightIcon={<ArrowRight size={16} />}
            >
              THANH TOÁN
            </Button>
          </Link>
          <p className="text-body-xs text-ink-300 text-center">
            {cart.type === 'guest' ? 'Giỏ tạm — đăng nhập để giữ lâu dài' : 'Đã đăng nhập'}
          </p>
        </div>

        <div className="border border-ink-700 bg-ink-900 p-4 text-body-xs text-ink-300 space-y-2">
          <p className="text-ink-100 font-semibold">CHÍNH SÁCH</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Giao hàng tự động ngay sau khi thanh toán thành công</li>
            <li>Hỗ trợ đổi/trả trong 7 ngày nếu sản phẩm lỗi</li>
            <li>Thanh toán an toàn qua QR ngân hàng</li>
          </ul>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmClear}
        title="Xoá toàn bộ giỏ hàng?"
        message="Tất cả sản phẩm trong giỏ sẽ bị xoá. Hành động này không thể hoàn tác."
        confirmLabel="Xoá tất cả"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
