import { db } from '@/lib/db'
import { catalogService } from '@/modules/catalog'
import { notFound } from 'next/navigation'
import { ProductForm } from '@/components/admin/product-form'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    catalogService.getProductForAdmin(params.id).catch(() => null),
    db.category.findMany({ orderBy: { position: 'asc' } }),
  ])
  if (!product) notFound()

  return (
    <div className="container-narrow py-10 space-y-6">
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / 01 / EDIT / {product.sku} ]
        </span>
        <h1 className="text-h1 font-display">{product.name}</h1>
      </div>

      <ProductForm
        mode="edit"
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        initial={{
          id: product.id,
          categoryId: product.categoryId,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          shortDescription: product.shortDescription ?? '',
          description: product.description ?? '',
          priceCents: product.priceCents.toString(),
          salePriceCents: product.salePriceCents?.toString() ?? '',
          currency: product.currency,
          deliveryStrategy: product.deliveryStrategy,
          stockStatus: product.stockStatus,
          trackInventory: product.trackInventory,
          isPublished: product.isPublished,
          isFeatured: product.isFeatured,
          seoTitle: product.seoTitle ?? '',
          seoDescription: product.seoDescription ?? '',
          variants: product.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            priceCents: v.priceCents.toString(),
            salePriceCents: v.salePriceCents?.toString() ?? '',
            durationDays: v.durationDays ?? undefined,
            position: v.position,
            isActive: v.isActive,
          })),
        }}
      />
    </div>
  )
}
