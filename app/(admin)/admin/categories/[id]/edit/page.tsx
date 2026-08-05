import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { CategoryForm } from '@/components/admin/category-form'

export const dynamic = 'force-dynamic'

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const [category, parents] = await Promise.all([
    db.category.findUnique({ where: { id: params.id } }),
    db.category.findMany({
      where: { id: { not: params.id } },
      orderBy: { position: 'asc' },
    }),
  ])
  if (!category) notFound()

  return (
    <div className="container-narrow py-10 space-y-6">
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / 02 / EDIT / {category.slug} ]
        </span>
        <h1 className="text-h1 font-display">{category.name}</h1>
      </div>

      <CategoryForm
        mode="edit"
        parents={parents.map((p) => ({ id: p.id, name: p.name }))}
        initial={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          isActive: category.isActive,
          position: category.position,
          description: category.description ?? '',
        }}
      />
    </div>
  )
}
