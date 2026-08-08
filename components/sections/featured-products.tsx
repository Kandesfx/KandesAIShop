import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/product/product-card'
import type { Product } from '@/modules/catalog/types'

interface FeaturedProductsProps {
  products: Array<
    Product & {
      category?: { name: string; slug: string } | null
      media?: { url: string; altText?: string | null }[]
      variants?: { priceCents: bigint; salePriceCents?: bigint | null }[]
    }
  >
  total?: number
}

/**
 * FeaturedProducts — section hiển thị sản phẩm nổi bật ngay dưới hero.
 *
 * Layout: responsive grid 1 col (mobile) / 2 cols (tablet) / 3 cols (desktop).
 * Section header có số thứ tự [03 / FEATURED · N SKU] + link "Tất cả" → /products.
 *
 * Empty state: nếu chưa có featured products, skip render hoàn toàn (caller check).
 */
export function FeaturedProducts({ products, total }: FeaturedProductsProps) {
  if (products.length === 0) return null

  return (
    <section
      className="relative py-16 lg:py-24 bg-ink-900 border-t border-ink-400"
      aria-labelledby="featured-heading"
    >
      <div className="container-narrow">
        {/* Section header */}
        <div className="flex items-end justify-between gap-6 mb-10 pb-6 border-b border-ink-400">
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
              [ 02 / FEATURED · {String(total ?? products.length).padStart(2, '0')} SKU ]
            </span>
            <h2
              id="featured-heading"
              className="text-display-lg font-display"
            >
              Đề xuất
              <span className="text-gradient-electric"> hôm nay.</span>
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-2 group px-4 py-2 border border-ink-300 hover:border-electric text-[12px] font-mono uppercase tracking-[0.14em] text-ink-100 hover:text-electric transition-all"
          >
            Tất cả
            <ArrowRight size={14} strokeWidth={1.5} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        {/* Grid: 1 col mobile / 2 cols tablet / 3 cols desktop — staggered entrance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-400 border border-ink-400">
          {products.map((p, idx) => (
            <div
              key={p.id}
              className="bg-ink-800 opacity-0 animate-slide-in-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <ProductCard product={p} index={idx + 1} featured />
            </div>
          ))}
        </div>

        {/* Mobile "xem tất cả" link */}
        <div className="mt-8 sm:hidden text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 group px-5 py-2.5 border border-ink-300 hover:border-electric text-[12px] font-mono uppercase tracking-[0.14em] text-ink-100 hover:text-electric transition-all"
          >
            Xem tất cả
            <ArrowRight size={14} strokeWidth={1.5} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}