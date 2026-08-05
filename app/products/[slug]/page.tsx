import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Box, ShieldCheck, Zap, Clock, CheckCircle2 } from 'lucide-react'
import { Breadcrumb } from '@/components/product/breadcrumb'
import { ProductCard } from '@/components/product/product-card'
import { catalogService } from '@/modules/catalog'
import {
  formatVND,
  DELIVERY_LABELS,
  STOCK_LABELS,
  DELIVERY_BADGE_CLASS,
} from '@/lib/format'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

async function getProduct(slug: string) {
  try {
    return await catalogService.getProductDetail(slug)
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const data = await getProduct(params.slug)
  if (!data) return { title: 'Không tìm thấy sản phẩm' }
  const p = data.product
  return {
    title: p.name,
    description: p.shortDescription ?? p.description?.slice(0, 160),
    openGraph: {
      title: `${p.name} · Kandes.shop`,
      description: p.shortDescription ?? p.description?.slice(0, 160),
      type: 'website',
    },
  }
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const data = await getProduct(params.slug)
  if (!data) notFound()

  const { product, related } = data
  const minPrice = product.variants.length
    ? product.variants.reduce((min, v) => {
        const vPrice = v.salePriceCents ?? v.priceCents
        return vPrice < min ? vPrice : min
      }, product.variants[0]?.priceCents ?? product.priceCents)
    : product.priceCents

  // JSON-LD structured data cho SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description?.slice(0, 160),
    sku: product.sku,
    brand: { '@type': 'Brand', name: 'Kandes.shop' },
    offers: {
      '@type': 'Offer',
      price: Number(minPrice),
      priceCurrency: product.currency,
      availability:
        product.stockStatus === 'in_stock'
          ? 'https://schema.org/InStock'
          : product.stockStatus === 'out_of_stock'
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/PreOrder',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="border-b border-ink-400 bg-ink-900">
        <div className="container-narrow py-8 lg:py-10">
          <Breadcrumb
            items={[
              { label: 'Trang chủ', href: '/' },
              { label: 'Sản phẩm', href: '/products' },
              ...(product.category
                ? [
                    {
                      label: product.category.name,
                      href: `/products?category=${product.category.slug}`,
                    },
                  ]
                : []),
              { label: product.name },
            ]}
          />
        </div>
      </section>

      {/* Product main */}
      <section className="py-12 lg:py-16">
        <div className="container-narrow">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Gallery */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square border border-ink-400 bg-ink-800 overflow-hidden">
                <span className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-electric" />
                <span className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-electric" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-plasma" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-plasma" />
                <div className="absolute inset-0 bg-grid-tech bg-[size:32px_32px] opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Box size={120} strokeWidth={1} className="text-electric" />
                </div>
                <span className="absolute bottom-3 left-3 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
                  {product.sku}
                </span>
              </div>

              {/* Trust badges */}
              <div className="mt-6 grid grid-cols-3 gap-px bg-ink-400 border border-ink-400">
                {[
                  { icon: Zap, label: 'Giao tự động', sub: '≤ 30 giây' },
                  { icon: ShieldCheck, label: 'Chính hãng', sub: 'Bảo hành 24h' },
                  { icon: Clock, label: 'Hỗ trợ 24/7', sub: 'Telegram / Zalo' },
                ].map((b) => {
                  const Icon = b.icon
                  return (
                    <div key={b.label} className="bg-ink-800 p-3 space-y-1 text-center">
                      <Icon
                        size={16}
                        strokeWidth={1.5}
                        className="text-electric mx-auto"
                        aria-hidden
                      />
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-50">
                        {b.label}
                      </div>
                      <div className="text-[10px] text-ink-200">{b.sub}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Info */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={DELIVERY_BADGE_CLASS[product.deliveryStrategy]}>
                  {DELIVERY_LABELS[product.deliveryStrategy]}
                </span>
                <span className="badge-neutral">{STOCK_LABELS[product.stockStatus]}</span>
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
                    {product.variants.length > 1 ? 'TỪ' : 'GIÁ'}
                  </div>
                  <div className="text-[40px] font-display font-bold text-electric leading-none">
                    {formatVND(minPrice)}
                  </div>
                  {product.variants.length > 1 && (
                    <div className="text-[12px] text-ink-100 mono pt-2">
                      {product.variants.length} gói — chọn bên dưới
                    </div>
                  )}
                </div>
              </div>

              {/* What you get */}
              <div className="border border-ink-400 bg-ink-800/30 p-5 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
                  BẠN NHẬN ĐƯỢC
                </span>
                <ul className="space-y-1.5 text-[13px] text-ink-100">
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={14}
                      className="text-electric mt-0.5 flex-shrink-0"
                      aria-hidden
                    />
                    Key / tài khoản chính hãng giao qua email & đơn hàng
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={14}
                      className="text-electric mt-0.5 flex-shrink-0"
                      aria-hidden
                    />
                    Hướng dẫn kích hoạt + cấu hình chi tiết
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={14}
                      className="text-electric mt-0.5 flex-shrink-0"
                      aria-hidden
                    />
                    Hỗ trợ kỹ thuật 24/7 qua Telegram / Zalo
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={14}
                      className="text-electric mt-0.5 flex-shrink-0"
                      aria-hidden
                    />
                    Đổi mới 1-đổi-1 nếu key lỗi trong 24h đầu
                  </li>
                </ul>
              </div>

              {/* Variant list */}
              {product.variants.length > 0 && (
                <div className="border border-ink-400 bg-ink-800/40">
                  <div className="px-4 py-2 border-b border-ink-400 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
                    CHỌN GÓI
                  </div>
                  <ul className="divide-y divide-ink-400">
                    {product.variants.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-ink-700/50 transition-colors"
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
                            {formatVND(v.salePriceCents ?? v.priceCents)}
                          </div>
                          <button
                            type="button"
                            disabled
                            className="btn-primary text-[11px] py-1.5"
                            title="Giỏ hàng sẽ có ở Phase 2"
                          >
                            MUA
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-12 lg:py-16 border-t border-ink-400">
          <div className="container-narrow">
            <div className="mb-8 pb-4 border-b border-ink-400 flex items-end justify-between">
              <h2 className="text-h1 font-display">
                Sản phẩm
                <span className="text-electric"> liên quan</span>
              </h2>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-100 hover:text-electric transition-colors"
              >
                Xem tất cả {product.category.name} →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-ink-400 border border-ink-400">
              {related.map((p, idx) => (
                <div key={p.id} className="bg-ink-800">
                  <ProductCard product={p} index={idx + 1} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
