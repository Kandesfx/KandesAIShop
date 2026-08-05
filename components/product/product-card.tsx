import Link from 'next/link'
import { ArrowUpRight, Zap, Box } from 'lucide-react'
import { formatVND, DELIVERY_LABELS, DELIVERY_BADGE_CLASS } from '@/lib/format'
import type { Product } from '@prisma/client'

interface ProductCardProps {
  product: Product & {
    category?: { name: string; slug: string } | null
    media?: { url: string; altText?: string | null }[]
    variants?: { priceCents: bigint; salePriceCents?: bigint | null }[]
  }
  index?: number
  featured?: boolean
}

export function ProductCard({ product, index, featured }: ProductCardProps) {
  // Tính giá min từ variants (nếu có) thay vì từ product.priceCents
  const minPrice = (() => {
    if (product.variants && product.variants.length > 0) {
      const first = product.variants[0]
      if (!first) return product.priceCents
      let min = first.salePriceCents ?? first.priceCents
      for (const v of product.variants) {
        const vPrice = v.salePriceCents ?? v.priceCents
        if (vPrice < min) min = vPrice
      }
      return min
    }
    return product.priceCents
  })()

  const idxLabel = index ? `/${String(index).padStart(2, '0')}` : null

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block bg-ink-800 border border-ink-400 hover:border-electric hover:bg-ink-700 transition-colors relative h-full"
    >
      {/* Header — index code + featured badge */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-400">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-200">
          {idxLabel ?? product.sku}
        </span>
        {featured && (
          <span className="badge-electric">
            <Zap size={9} strokeWidth={2} aria-hidden /> FEATURED
          </span>
        )}
      </div>

      {/* Product visual — dùng icon đơn giản làm placeholder */}
      <div className="aspect-[4/3] bg-ink-900 border-b border-ink-400 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-tech bg-[size:24px_24px] opacity-30" />
        <Box size={48} strokeWidth={1} className="text-electric relative" aria-hidden />
        <span className="absolute bottom-2 right-2 text-[9px] font-mono uppercase tracking-[0.18em] text-ink-200">
          {product.category?.name ?? 'Uncategorized'}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <h3 className="text-[16px] font-display font-semibold text-ink-50 group-hover:text-electric transition-colors line-clamp-1">
          {product.name}
        </h3>

        {product.shortDescription && (
          <p className="text-[12px] text-ink-100 leading-relaxed line-clamp-2 mono">
            {product.shortDescription}
          </p>
        )}

        <div className="flex items-end justify-between pt-2 border-t border-ink-400">
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
              {product.variants && product.variants.length > 1 ? 'TỪ' : 'GIÁ'}
            </div>
            <div className="text-[18px] font-display font-bold text-electric">
              {formatVND(minPrice)}
            </div>
          </div>
          <span className={`${DELIVERY_BADGE_CLASS[product.deliveryStrategy]} text-[9px]`}>
            {DELIVERY_LABELS[product.deliveryStrategy]}
          </span>
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight size={14} strokeWidth={1.5} className="text-electric" aria-hidden />
      </div>
    </Link>
  )
}
