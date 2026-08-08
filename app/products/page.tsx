import { Inbox } from 'lucide-react'
import { Breadcrumb } from '@/components/product/breadcrumb'
import { FilterPanel } from '@/components/product/filter-panel'
import { ClearFiltersButton } from '@/components/product/clear-filters-button'
import { ProductCard } from '@/components/product/product-card'
import { Pagination } from '@/components/product/pagination'
import { catalogService } from '@/modules/catalog'
import { listProductsSchema } from '@/modules/catalog/validators'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface SearchParams {
  q?: string
  category?: string
  sort?: string
  page?: string
  minPrice?: string
  maxPrice?: string
}

type ProductWithRelations = Prisma.PromiseReturnType<
  (typeof catalogService)['listPublishedProducts']
>['items'][number]

type CategoryItem = {
  slug: string
  name: string
  description: string | null
  _count?: { products: number }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  let items: ProductWithRelations[] = []
  let total = 0
  let page = 1
  let pageSize = 12
  let totalPages = 0
  let categories: CategoryItem[] = []
  let sort: string = 'newest'

  try {
    const parsed = listProductsSchema.parse(searchParams)
    sort = parsed.sort
    const [listResult, cats] = await Promise.all([
      catalogService.listPublishedProducts(parsed),
      catalogService.listActiveCategories(),
    ])
    items = listResult.items
    total = listResult.total
    page = listResult.page
    pageSize = listResult.pageSize
    totalPages = listResult.totalPages
    categories = cats as CategoryItem[]
  } catch {
    // DB down — show empty state gracefully
  }

  const activeCategory = searchParams.category
    ? categories.find((c) => c.slug === searchParams.category)
    : null

  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink-400 bg-ink-900">
        <div className="container-narrow py-12 lg:py-16">
          <div className="space-y-4">
            <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Sản phẩm' }]} />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
              [ CATALOG · {String(total).padStart(3, '0')} SKU ]
            </span>
            <h1 className="text-display-lg font-display">
              {activeCategory ? activeCategory.name : 'Tất cả sản phẩm'}
            </h1>
            {activeCategory?.description && (
              <p className="text-body text-ink-100 max-w-2xl">{activeCategory.description}</p>
            )}
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="py-12 lg:py-16">
        <div className="container-narrow grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar filter */}
          <aside className="lg:col-span-3 lg:sticky lg:top-[96px] lg:self-start">
            <FilterPanel categories={categories} />
          </aside>

          {/* Products */}
          <div className="lg:col-span-9">
            {items.length === 0 ? (
              <div className="border border-ink-400 bg-ink-800 p-12 text-center space-y-4">
                <Inbox size={32} strokeWidth={1} className="mx-auto text-ink-200" aria-hidden />
                <div className="space-y-1">
                  <h3 className="text-h3 font-display">Không tìm thấy sản phẩm</h3>
                  <p className="text-body-sm text-ink-100">
                    Thử điều chỉnh bộ lọc hoặc từ khoá khác.
                  </p>
                </div>
                <ClearFiltersButton />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
                  <span>
                    HIỂN THỊ {(page - 1) * pageSize + 1}—{Math.min(page * pageSize, total)} / {total}
                  </span>
                  <span>SORT: {sort.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-400 border border-ink-400">
                  {items.map((p, idx) => (
                    <div key={p.id} className="bg-ink-800">
                      <ProductCard product={p} index={idx + 1 + (page - 1) * pageSize} />
                    </div>
                  ))}
                </div>

                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  basePath="/products"
                  searchParams={searchParams as Record<string, string | undefined>}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
