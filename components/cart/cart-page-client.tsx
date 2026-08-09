'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CartItemRow } from '@/components/cart/cart-item'
import { formatVnd } from '@/lib/format'
import { useCart } from '@/lib/cart-context'

/**
 * Client-side cart page body.
 * Dùng useCart() từ CartProvider (single source of truth).
 * Mutations → provider actions → tất cả consumers re-render.
 */
export function CartPageClient() {
  const { cart, loading, error, updateItem, removeItem, clearCart } = useCart()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  // CartPageClient chỉ render khi cart đã load (server đã fetch rồi)
  if (!cart) {
    return (
      <div className="text-center py-16">
        <p className="text-ink-300">Đang tải giỏ hàng...</p>
      </div>
    )
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

  const handleChange = async (itemId: string, qty: number) => {
    setBusyId(itemId)
    try {
      await updateItem(itemId, qty)
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (itemId: string) => {
    setBusyId(itemId)
    try {
      await removeItem(itemId)
    } finally {
      setBusyId(null)
    }
  }

  // D3: sau khi lưu vào wishlist thành công (SaveForLaterButton tự gọi
  // POST /api/wishlist) → xoá item khỏi cart để tránh trùng lặp ý định.
  const handleSaveForLater = async (itemId: string) => {
    setBusyId(itemId)
    try {
      await removeItem(itemId)
    } finally {
      setBusyId(null)
    }
  }

  const handleClear = async () => {
    setConfirmClear(false)
    setClearing(true)
    try {
      await clearCart()
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <section className="space-y-3">
        {error && (
          <div role="alert" className="border border-danger/40 bg-danger/10 text-danger text-body-sm p-2.5">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-ink-50">
            Sản phẩm <span className="text-ink-400 text-body-sm">({cart.itemCount} món · {cart.lineCount} dòng)</span>
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
              onChange={(qty) => handleChange(item.id, qty)}
              onRemove={() => handleRemove(item.id)}
              onSaveForLater={() => handleSaveForLater(item.id)}
              isLoggedIn={cart.type === 'user'}
              busy={busyId === item.id}
            />
          ))}
        </div>

        {cart.type === 'user' && (
          <p className="text-body-xs text-ink-300">
            <Link href="/account/wishlist" className="text-electric hover:underline">
              Xem danh sách đã lưu
            </Link>
          </p>
        )}
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

          <div className="pt-2 space-y-2">
            <Link href="/checkout" className="block">
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
        </div>

        <div className="border border-ink-700 bg-ink-900 p-4 text-body-xs text-ink-300 space-y-2">
          <p className="text-ink-100 font-semibold">CHÍNH SÁCH</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Giao hàng tự động ngay sau thanh toán thành công</li>
            <li>Hỗ trợ đổi/trả trong 7 ngày nếu sản phẩm lỗi</li>
            <li>Thanh toán an toàn qua QR ngân hàng</li>
          </ul>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmClear}
        title="Xoá tất cả sản phẩm?"
        message="Bạn có chắc muốn xoá tất cả sản phẩm khỏi giỏ hàng?"
        confirmLabel="Xoá tất cả"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
