import { db } from '@/lib/db'
import { ProductForm } from '@/components/admin/product-form'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const categories = await db.category.findMany({ orderBy: { position: 'asc' } })

  return (
    <div className="container-narrow py-10 space-y-6">
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / 01 / NEW ]
        </span>
        <h1 className="text-h1 font-display">Tạo sản phẩm mới</h1>
      </div>

      <ProductForm
        mode="create"
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      />
    </div>
  )
}
