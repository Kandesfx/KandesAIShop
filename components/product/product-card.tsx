'use client'

import Link from 'next/link'
import { ArrowUpRight, Zap, Box } from 'lucide-react'
import { formatVND, DELIVERY_LABELS, DELIVERY_BADGE_CLASS, getMinProductPrice, hasProductSale } from '@/lib/format'
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
  // Dùng centralized helper — tránh duplicate logic giữa PDP và ProductCard.
  const minPrice = getMinProductPrice(product)
  const isOnSale = hasProductSale(product)

  const idxLabel = index ? `/${String(index).padStart(2, '0')}` : null

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block bg-ink-800 border border-ink-400 hover:border-electric/60 hover:bg-ink-700/80 transition-all duration-200 relative h-full hover:-translate-y-0.5"
      style={{
        boxShadow: 'none',
        transition: 'all 0.2s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 0 24px -8px rgba(0, 229, 255, 0.2), 0 8px 24px -8px rgba(0, 0, 0, 0.4)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
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

      {/* Product visual — enhanced with gradient shimmer overlay */}
      <div className="aspect-[4/3] bg-ink-900 border-b border-ink-400 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-tech bg-[size:24px_24px] opacity-30" />
        {/* Animated gradient overlay on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-electric/5 via-transparent to-plasma/5" />
        <Box size={48} strokeWidth={1} className="text-electric relative transition-transform duration-300 group-hover:scale-110" aria-hidden />
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
            <div className={`text-[18px] font-display font-bold ${isOnSale ? 'text-sunset' : 'text-electric'}`}>
              {formatVND(minPrice)}
              {isOnSale && (
                <span className="ml-2 text-[12px] text-ink-200 line-through font-normal">
                  {/* Original price indicator */}
                  Sale
                </span>
              )}
            </div>
          </div>
          <span className={`${DELIVERY_BADGE_CLASS[product.deliveryStrategy]} text-[9px]`}>
            {DELIVERY_LABELS[product.deliveryStrategy]}
          </span>
        </div>
      </div>

      {/* Hover arrow — animated */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
        <ArrowUpRight size={14} strokeWidth={1.5} className="text-electric" aria-hidden />
      </div>
    </Link>
  )
}
