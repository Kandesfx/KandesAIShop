import { Hero } from '@/components/sections/hero'
import { FeaturedProducts } from '@/components/sections/featured-products'
import { Categories } from '@/components/sections/categories'
import { ValueProps } from '@/components/sections/value-props'
import { catalogService } from '@/modules/catalog'

export default async function HomePage() {
  // Featured products cho grid dưới hero — user yêu cầu sản phẩm hiển thị
  // ngay dưới hero (2026-08-08 redesign).
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

      {/* Featured Products — ngay dưới hero, response grid 1/2/3 cols */}
      <FeaturedProducts products={featured.items} total={featured.total} />

      {/* Categories */}
      <Categories categories={categories} />

      {/* Value props */}
      <ValueProps />
    </>
  )
}