import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Prisma } from '@prisma/client'
import { catalogService } from '@/modules/catalog'
import { listProductsSchema } from '@/modules/catalog/validators'
import { formatVND, DELIVERY_LABELS } from '@/lib/format'
import { db } from '@/lib/db'
import { Pagination } from '@/components/product/pagination'
import { ProductRowActions } from '@/components/admin/product-row-actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { q?: string; page?: string }
}

type AdminProductItem = Prisma.PromiseReturnType<
  (typeof catalogService)['listProductsForAdmin']
>['items'][number]

export default async function AdminProductsPage({ searchParams }: PageProps) {
  let items: AdminProductItem[] = []
  let total = 0
  let page = 1
  let pageSize = 20
  let totalPages = 0
  let categories: Prisma.CategoryGetPayload<object>[] = []

  try {
    const input = listProductsSchema.parse({
      ...searchParams,
      includeUnpublished: true,
    })
    const [listResult, cats] = await Promise.all([
      catalogService.listProductsForAdmin(input),
      db.category.findMany({ orderBy: { position: 'asc' } }),
    ])
    items = listResult.items
    total = listResult.total
    page = listResult.page
    pageSize = listResult.pageSize
    totalPages = listResult.totalPages
    categories = cats
  } catch {
    // DB down — show empty table
  }

  const baseParams: Record<string, string | undefined> = {
    q: searchParams.q,
  }

  return (
    <div className="container-narrow py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-ink-400">
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
            [ ADMIN / 01 / PRODUCTS · {String(total).padStart(3, '0')} ]
          </span>
          <h1 className="text-h1 font-display">Sản phẩm</h1>
        </div>
        <Link href="/admin/products/new" className="btn-primary text-[11px]">
          <Plus size={14} strokeWidth={2} />
          Thêm sản phẩm
        </Link>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder="Tìm theo tên, SKU..."
          className="input flex-1"
        />
        <button type="submit" className="btn-outline text-[11px]">
          TÌM
        </button>
      </form>

      {/* Table */}
      <div className="border border-ink-400 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-ink-800 border-b border-ink-400">
            <tr className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-200">
              <th className="px-3 py-2 text-left w-12">/SKU</th>
              <th className="px-3 py-2 text-left">TÊN</th>
              <th className="px-3 py-2 text-left hidden md:table-cell">DANH MỤC</th>
              <th className="px-3 py-2 text-right">GIÁ</th>
              <th className="px-3 py-2 text-left hidden lg:table-cell">DELIVERY</th>
              <th className="px-3 py-2 text-center">STATUS</th>
              <th className="px-3 py-2 text-right w-24">HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-400">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-ink-700/30 text-[13px]">
                <td className="px-3 py-3 mono text-ink-200 text-[11px]">{p.sku}</td>
                <td className="px-3 py-3">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="text-ink-50 hover:text-electric transition-colors font-medium"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-3 text-ink-100 hidden md:table-cell">
                  {p.category.name}
                </td>
                <td className="px-3 py-3 text-right mono text-ink-100">
                  {formatVND(p.priceCents)}
                </td>
                <td className="px-3 py-3 text-[11px] mono text-ink-100 hidden lg:table-cell">
                  {DELIVERY_LABELS[p.deliveryStrategy]}
                </td>
                <td className="px-3 py-3 text-center">
                  {p.isPublished ? (
                    <span className="badge-electric text-[9px]">LIVE</span>
                  ) : (
                    <span className="badge-neutral text-[9px]">DRAFT</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <ProductRowActions id={p.id} name={p.name} />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-ink-100">
                  Không có sản phẩm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — re-use shared component */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/admin/products"
        searchParams={baseParams}
      />
    </div>
  )
}
