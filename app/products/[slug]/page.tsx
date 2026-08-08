import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Box, ShieldCheck, Zap, Clock } from 'lucide-react'
import { Breadcrumb } from '@/components/product/breadcrumb'
import { ProductCard } from '@/components/product/product-card'
import { ProductPurchaseSection } from '@/components/product/product-purchase-section'
import { ProductDetailTabs } from '@/components/product/product-detail-tabs'
import { catalogService } from '@/modules/catalog'
import { productQuestionService } from '@/modules/product-question'
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

/**
 * PDP — Phase 8b Đợt 1 (A1 + A5).
 *
 * ProductPurchaseSection là client component chứa:
 *   - Variant selection state (selectedVariantId)
 *   - AddToCartButton → POST /api/cart/items
 *   - Toast feedback
 *
 * Server component giữ gallery + metadata + JSON-LD + related products.
 */
export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const data = await getProduct(params.slug)
  if (!data) notFound()

  const { product, related } = data

  // Get questions count for tabs (Phase 9 D1)
  const questionsCount = await productQuestionService.countByProduct(product.id)

  const minPrice = product.variants.length
    ? product.variants.reduce(
        (min, v) => {
          const vPrice = Number(v.salePriceCents ?? v.priceCents)
          return vPrice < min ? vPrice : min
        },
        Number(product.variants[0]?.priceCents ?? product.priceCents)
      )
    : Number(product.priceCents)

  // F6: minPrice là số nguyên VND (schema lưu VND không có cents — 1 đơn vị = 1 ₫).
  // JSON-LD offers.price kỳ vọng giá trị theo priceCurrency, nên với VND ta pass
  // thẳng integer. Nếu tương lai migrate sang USD (có cents) → phải chia 100 ở đây
  // + cập nhật formatVND. Xem CONTEXT §7 nếu mở deviation currency.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description?.slice(0, 160),
    sku: product.sku,
    brand: { '@type': 'Brand', name: 'Kandes.shop' },
    offers: {
      '@type': 'Offer',
      price: minPrice,
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
            {/* Gallery — server-rendered */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square border border-ink-400 bg-ink-800 overflow-hidden">
                <span className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-electric" />
                <span className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-electric" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-plasma" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-plasma" />
                {product.media && product.media.length > 0 && product.media[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.media[0]!.url}
                    alt={product.media[0]!.altText ?? product.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-grid-tech bg-[size:32px_32px] opacity-30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Box size={120} strokeWidth={1} className="text-electric" />
                    </div>
                  </>
                )}
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

            {/* Info — client component (A1 + A5) */}
            <div className="lg:col-span-7 space-y-6">
              <ProductPurchaseSection product={product} minPrice={minPrice} />
            </div>
          </div>
        </div>
      </section>

      {/* Reviews & Q&A Tabs — Phase 9 D1 */}
      <section className="py-12 lg:py-16 border-t border-ink-400">
        <div className="container-narrow">
          <ProductDetailTabs
            productSlug={product.slug}
            reviewsCount={product.reviewCount}
            questionsCount={questionsCount}
          />
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
