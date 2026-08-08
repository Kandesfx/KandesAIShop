'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, CheckCircle2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  formatVND,
  DELIVERY_LABELS,
  STOCK_LABELS,
  DELIVERY_BADGE_CLASS,
} from '@/lib/format'
import { useCart } from '@/lib/cart-context'

interface Variant {
  id: string
  name: string
  priceCents: bigint | number
  salePriceCents: bigint | number | null
  durationDays: number | null
  sku: string
}

interface Product {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  description: string | null
  variants: Variant[]
  priceCents: bigint | number
  salePriceCents: bigint | number | null
  deliveryStrategy: string
  stockStatus: string
  isFeatured: boolean
}

interface ProductPurchaseSectionProps {
  product: Product
  minPrice: bigint | number
}

function getVariantPrice(v: Variant): bigint | number {
  return v.salePriceCents ?? v.priceCents
}

function isOutOfStock(product: Product, variantId: string | null): boolean {
  if (!variantId) return false
  return product.stockStatus === 'out_of_stock'
}

export function ProductPurchaseSection({ product, minPrice }: ProductPurchaseSectionProps) {
  const { upsertItem } = useCart()
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const hasVariants = product.variants.length > 0

  const displayPrice = selectedVariant
    ? getVariantPrice(selectedVariant)
    : minPrice

  const productOutOfStock = product.stockStatus === 'out_of_stock'
  const selectedOutOfStock = selectedVariantId ? isOutOfStock(product, selectedVariantId) : false
  const canBuy =
    !hasVariants
      ? !productOutOfStock
      : selectedVariantId !== null && !selectedOutOfStock

  const handleAddToCart = async () => {
    if (!canBuy) return
    setBusy(true)
    setToast(null)
    try {
      await upsertItem({
        productId: product.id,
        variantId: selectedVariantId,
        quantity: 1,
      })
      setToast('Đã thêm vào giỏ hàng')
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      setToast((e as Error).message || 'Không thể thêm vào giỏ')
      setTimeout(() => setToast(null), 4000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={DELIVERY_BADGE_CLASS[product.deliveryStrategy]}>
          {DELIVERY_LABELS[product.deliveryStrategy]}
        </span>
        <span className="badge-neutral">
          {STOCK_LABELS[product.stockStatus]}
        </span>
        {product.isFeatured && (
          <span className="badge-electric">
            <Zap size={9} strokeWidth={2} aria-hidden /> FEATURED
          </span>
        )}
      </div>

      {/* Name + description */}
      <div className="space-y-3">
        <h1 className="text-display-lg font-display text-ink-50">{product.name}</h1>
        {product.shortDescription && (
          <p className="text-body-lg text-ink-100">{product.shortDescription}</p>
        )}
      </div>

      {/* Price block */}
      <div className="border border-electric/40 bg-electric/5 p-6 relative">
        <span className="absolute top-0 left-0 px-2 py-0.5 bg-electric text-ink-900 text-[9px] font-mono uppercase tracking-[0.16em]">
          GIÁ BÁN
        </span>
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
            {hasVariants ? 'TỪ' : 'GIÁ'}
          </div>
          <div className="text-[40px] font-display font-bold text-electric leading-none">
            {formatVND(displayPrice)}
          </div>
          {hasVariants && (
            <div className="text-[12px] text-ink-100 mono pt-2">
              {product.variants.length} gói — chọn bên dưới
            </div>
          )}
        </div>
      </div>

      {/* What you get */}
      <div className="border border-ink-400 bg-ink-800/30 p-5 space-y-2">
        <span id="what-you-get-label" className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
          BẠN NHẬN ĐƯỢC
        </span>
        {/* role="list" giữ list semantics cho VoiceOver khi list-style:none (Safari strip) */}
        <ul role="list" aria-labelledby="what-you-get-label" className="space-y-1.5 text-[13px] text-ink-100">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-electric mt-0.5 flex-shrink-0" aria-hidden />
            Key / tài khoản chính hãng giao qua email & đơn hàng
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-electric mt-0.5 flex-shrink-0" aria-hidden />
            Hướng dẫn kích hoạt + cấu hình chi tiết
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-electric mt-0.5 flex-shrink-0" aria-hidden />
            Hỗ trợ kỹ thuật 24/7 qua Telegram / Zalo
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-electric mt-0.5 flex-shrink-0" aria-hidden />
            Đổi mới 1-đổi-1 nếu key lỗi trong 24h đầu
          </li>
        </ul>
      </div>

      {/* Variant list */}
      {hasVariants && (
        <div className="border border-ink-400 bg-ink-800/40">
          <div className="px-4 py-2 border-b border-ink-400 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
            CHỌN GÓI
          </div>
          <ul className="divide-y divide-ink-400">
            {product.variants.map((v) => {
              const selected = v.id === selectedVariantId
              const outOfStock = isOutOfStock(product, v.id)
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => !outOfStock && setSelectedVariantId(v.id)}
                    disabled={outOfStock}
                    aria-pressed={selected}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3 transition-colors text-left',
                      selected
                        ? 'bg-electric/10 border-l-2 border-l-electric'
                        : 'hover:bg-ink-700/50',
                      outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="space-y-0.5">
                      <div className="text-[14px] text-ink-50 font-medium">{v.name}</div>
                      <div className="text-[10px] mono text-ink-200">
                        {v.durationDays ? `${v.durationDays} ngày` : 'Vĩnh viễn'} ·{' '}
                        <span className="text-ink-100">SKU: {v.sku}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[15px] font-display font-bold text-electric">
                        {formatVND(getVariantPrice(v))}
                      </div>
                      {outOfStock ? (
                        <span className="text-[11px] px-2 py-1 border border-ink-300 text-ink-300">
                          HẾT HÀNG
                        </span>
                      ) : selected ? (
                        <span className="text-electric text-[11px]">✓ Đã chọn</span>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Add to cart / out-of-stock */}
      <div className="space-y-3">
        {product.stockStatus === 'out_of_stock' && !hasVariants ? (
          <Button variant="primary" disabled className="w-full" size="lg">
            HẾT HÀNG
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleAddToCart}
            disabled={!canBuy || busy}
            aria-busy={busy}
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin" aria-hidden>⟳</span>
                Đang thêm...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShoppingCart size={16} aria-hidden />
                {canBuy ? 'MUA NGAY' : hasVariants ? 'CHỌN GÓI ĐỂ MUA' : 'THÊM VÀO GIỎ'}
              </span>
            )}
          </Button>
        )}

        {hasVariants && !selectedVariantId && (
          <p className="text-[11px] text-ink-200 text-center">
            Vui lòng chọn gói phù hợp để tiếp tục
          </p>
        )}

        {/* Toast */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="border border-electric/40 bg-electric/10 text-electric text-[13px] p-3 text-center"
          >
            {toast}
          </div>
        )}
      </div>

      {/* Help link */}
      <div className="border border-ink-400 bg-ink-800/30 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[13px] text-ink-50 font-medium">
            Cần tư vấn trước khi mua?
          </div>
          <div className="text-[11px] text-ink-100">Admin phản hồi trong vài phút.</div>
        </div>
        <Link href="/support/new" className="btn-outline text-[11px]">
          Liên hệ admin
        </Link>
      </div>

      {/* Description */}
      {product.description && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
            MÔ TẢ
          </h2>
          <div className="prose prose-invert prose-sm max-w-none text-ink-100 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        </div>
      )}
    </>
  )
}
