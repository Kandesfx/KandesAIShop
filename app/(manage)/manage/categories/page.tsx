import { Plus } from 'lucide-react'
import Link from 'next/link'
import { catalogService } from '@/modules/catalog'
import { CategoryRowActions } from '@/components/admin/category-row-actions'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const items = await catalogService.listCategoriesForAdmin()

  return (
    <div className="container-narrow py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-ink-400">
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
            [ ADMIN / 02 / CATEGORIES · {String(items.length).padStart(2, '0')} ]
          </span>
          <h1 className="text-h1 font-display">Danh mục</h1>
        </div>
        <Link href="/manage/categories/new" className="btn-primary text-[12px]">
          <Plus size={14} strokeWidth={2} />
          Thêm danh mục
        </Link>
      </div>

      <div className="border border-ink-400">
        <table className="w-full">
          <thead className="bg-ink-800 border-b border-ink-400">
            <tr className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-100">
              <th className="px-3 py-2 text-left w-12">#</th>
              <th className="px-3 py-2 text-left">TÊN</th>
              <th className="px-3 py-2 text-left">SLUG</th>
              <th className="px-3 py-2 text-right">SẢN PHẨM</th>
              <th className="px-3 py-2 text-right">CON</th>
              <th className="px-3 py-2 text-center">STATUS</th>
              <th className="px-3 py-2 text-right w-24">HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-400">
            {items.map((c, idx) => (
              <tr key={c.id} className="hover:bg-ink-700/30 text-[13px]">
                <td className="px-3 py-3 mono text-ink-100 text-[12px]">
                  {String(idx + 1).padStart(2, '0')}
                </td>
                <td className="px-3 py-3 text-ink-50 font-medium">{c.name}</td>
                <td className="px-3 py-3 mono text-ink-100 text-[12px]">{c.slug}</td>
                <td className="px-3 py-3 text-right mono text-ink-100">
                  {c._count.products}
                </td>
                <td className="px-3 py-3 text-right mono text-ink-100">
                  {c._count.children}
                </td>
                <td className="px-3 py-3 text-center">
                  {c.isActive ? (
                    <span className="badge-electric text-[9px]">ACTIVE</span>
                  ) : (
                    <span className="badge-neutral text-[9px]">HIDDEN</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <CategoryRowActions id={c.id} name={c.name} />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-ink-100">
                  Chưa có danh mục nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
