import { Hero } from '@/components/sections/hero'
import { FeaturedProducts } from '@/components/sections/featured-products'
import { Categories } from '@/components/sections/categories'
import { ValueProps } from '@/components/sections/value-props'
import { catalogService } from '@/modules/catalog'

export default async function HomePage() {
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

      {/* Featured Products */}
      <FeaturedProducts products={featured.items} total={featured.total} />

      {/* Categories */}
      <Categories categories={categories} />

      {/* Value props */}
      <ValueProps />
    </>
  )
}