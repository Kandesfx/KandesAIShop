'use client'

import Link from 'next/link'
import { Box } from 'lucide-react'
import { formatVND, getMinProductPrice, hasProductSale } from '@/lib/format'

interface CrossSellProduct {
  id: string
  slug: string
  name: string
  sku: string
  priceCents: bigint | number
  category?: { name: string; slug: string } | null
  media?: { url: string; altText?: string | null }[]
  variants?: { priceCents: bigint | number; salePriceCents?: bigint | number | null }[]
}

interface CrossSellCarouselProps {
  products: CrossSellProduct[]
}

/**
 * CrossSellCarousel — "Khách cũng mua" (Phase 9 D2).
 *
 * Horizontal scroll carousel, không dùng thư viện ngoài — scroll-snap CSS
 * đủ nhẹ và nhất quán với pattern D6 (mobile gallery scroll) trong Phase 9.
 */
export function CrossSellCarousel({ products }: CrossSellCarouselProps) {
  if (products.length === 0) return null

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
      style={{ scrollbarWidth: 'thin' }}
    >
      {products.map((p) => {
        const minPrice = getMinProductPrice(p)
        const isOnSale = hasProductSale(p)
        return (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            className="group flex-shrink-0 w-[220px] snap-start bg-ink-800 border border-ink-400 hover:border-electric/60 hover:bg-ink-700/80 transition-all duration-200"
          >
            <div className="aspect-[4/3] bg-ink-900 border-b border-ink-400 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-tech bg-[size:24px_24px] opacity-30" />
              <Box
                size={40}
                strokeWidth={1}
                className="text-electric relative transition-transform duration-300 group-hover:scale-110"
                aria-hidden
              />
            </div>
            <div className="p-3 space-y-2">
              <h3 className="text-[13px] font-display font-semibold text-ink-50 group-hover:text-electric transition-colors line-clamp-1">
                {p.name}
              </h3>
              <div className={`text-[15px] font-display font-bold ${isOnSale ? 'text-sunset' : 'text-electric'}`}>
                {formatVND(minPrice)}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
