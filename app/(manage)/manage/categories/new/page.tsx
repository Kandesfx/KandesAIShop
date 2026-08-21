import { db } from '@/lib/db'
import { CategoryForm } from '@/components/admin/category-form'

export const dynamic = 'force-dynamic'

export default async function NewCategoryPage() {
  const categories = await db.category.findMany({ orderBy: { position: 'asc' } })

  return (
    <div className="container-narrow py-10 space-y-6">
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / 02 / NEW CATEGORY ]
        </span>
        <h1 className="text-h1 font-display">Tạo danh mục</h1>
      </div>

      <CategoryForm
        mode="create"
        parents={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  )
}
