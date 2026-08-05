import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ProductCard } from '@/components/product/product-card'
import { Hero } from '@/components/sections/hero'
import { Categories } from '@/components/sections/categories'
import { ValueProps } from '@/components/sections/value-props'
import { catalogService } from '@/modules/catalog'

export default async function HomePage() {
  // Featured products cho grid dưới
  const [featured, categories] = await Promise.all([
    catalogService
      .listPublishedProducts({
        featured: true,
        sort: 'newest',
        page: 1,
        pageSize: 6,
      })
      .catch(() => ({ items: [], total: 0 })),
    catalogService.listActiveCategories().catch(() => []),
  ])

  return (
    <>
      <Hero />

      {/* Categories (link to catalog) */}
      <Categories categories={categories} />

      {/* Featured Products */}
      {featured.items.length > 0 && (
        <section className="relative py-24 lg:py-32 border-t border-ink-400">
          <div className="container-narrow">
            <div className="flex items-end justify-between gap-6 mb-12 pb-6 border-b border-ink-400">
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
                  [ 03 / FEATURED · {String(featured.total).padStart(2, '0')} SKU ]
                </span>
                <h2 className="text-display-lg font-display">
                  Đề xuất
                  <span className="text-electric"> hôm nay.</span>
                </h2>
              </div>
              <Link
                href="/products"
                className="hidden sm:inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.14em] text-ink-100 hover:text-electric transition-colors"
              >
                Tất cả
                <ArrowUpRight size={14} strokeWidth={1.5} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-400 border border-ink-400">
              {featured.items.map((p, idx) => (
                <div key={p.id} className="bg-ink-800">
                  <ProductCard product={p} index={idx + 1} featured />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Value props */}
      <ValueProps />

      {/* CTA */}
      <section className="relative border-t border-ink-400 py-24 lg:py-32">
        <div className="container-narrow">
          <div className="border border-ink-400 p-10 lg:p-16 bg-ink-800/40 relative">
            <span className="absolute top-0 left-0 px-3 py-1 bg-electric text-ink-900 text-[10px] font-mono uppercase tracking-[0.18em]">
              [ CTA / 04 ]
            </span>
            <div className="max-w-3xl space-y-6">
              <h2 className="text-display-lg font-display text-ink-50">
                Sẵn sàng
                <span className="text-electric"> nâng cấp</span>
                <br />
                workflow của bạn?
              </h2>
              <p className="text-[16px] text-ink-100 leading-relaxed max-w-xl">
                Hơn 50 sản phẩm AI / dev tools đang chờ. Chọn cái phù hợp, thanh toán QR, nhận
                key qua email — chưa đến 1 phút.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link href="/products" className="btn-primary">
                  Xem tất cả sản phẩm
                  <ArrowUpRight size={16} strokeWidth={2} />
                </Link>
                <Link href="/help/how-to-buy" className="btn-outline">
                  Hướng dẫn mua hàng
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
