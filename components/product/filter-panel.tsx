'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá tăng dần' },
  { value: 'price-desc', label: 'Giá giảm dần' },
  { value: 'popular', label: 'Phổ biến nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
]

interface FilterPanelProps {
  categories: { slug: string; name: string; _count?: { products: number } }[]
}

/**
 * Filter panel cho trang /products. URL-driven, shareable.
 */
export function FilterPanel({ categories }: FilterPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [open, setOpen] = useState(false)
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '')
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '')

  // Sync local state khi URL thay đổi (vd khi user back/forward)
  useEffect(() => {
    setMinPrice(params.get('minPrice') ?? '')
    setMaxPrice(params.get('maxPrice') ?? '')
  }, [params])

  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
      // reset page on filter change
      if (key !== 'page') next.delete('page')
      const qs = next.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router]
  )

  const clearAll = () => router.push(pathname, { scroll: false })

  const current = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    sort: params.get('sort') ?? 'newest',
  }

  const hasFilter =
    !!current.q ||
    !!current.category ||
    !!minPrice ||
    !!maxPrice ||
    current.sort !== 'newest'

  return (
    <div className="border border-ink-400 bg-ink-800">
      {/* Search row */}
      <div className="p-4 border-b border-ink-400">
        <label className="label block mb-2">TÌM KIẾM</label>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const q = String(formData.get('q') || '').trim()
            update('q', q || null)
          }}
          className="relative"
        >
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-200"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={current.q}
            placeholder="Cursor, Claude, GitHub..."
            className="input pl-9 pr-3"
          />
        </form>
      </div>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="md:hidden w-full p-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-ink-100"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal size={12} aria-hidden />
          BỘ LỌC
        </span>
        <span>{open ? '−' : '+'}</span>
      </button>

      <div className={`${open ? 'block' : 'hidden'} md:block p-4 space-y-5`}>
        {/* Sort */}
        <div>
          <label className="label block mb-2" htmlFor="filter-sort">
            SẮP XẾP
          </label>
          <select
            id="filter-sort"
            value={current.sort}
            onChange={(e) => update('sort', e.target.value)}
            className="input"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <span className="label block mb-2">DANH MỤC</span>
          <ul className="space-y-1" role="list">
            <li>
              <button
                type="button"
                onClick={() => update('category', null)}
                className={`w-full text-left px-2 py-1.5 text-[12px] transition-colors ${
                  !current.category
                    ? 'text-electric bg-electric/5 border-l-2 border-electric'
                    : 'text-ink-100 hover:text-electric'
                }`}
              >
                Tất cả
              </button>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => update('category', c.slug)}
                  className={`w-full text-left px-2 py-1.5 text-[12px] flex items-center justify-between transition-colors ${
                    current.category === c.slug
                      ? 'text-electric bg-electric/5 border-l-2 border-electric'
                      : 'text-ink-100 hover:text-electric'
                  }`}
                >
                  <span>{c.name}</span>
                  {c._count && (
                    <span className="text-[10px] font-mono text-ink-200">
                      {c._count.products}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Price range */}
        <div>
          <label className="label block mb-2">KHOẢNG GIÁ (₫)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onBlur={() => update('minPrice', minPrice || null)}
              className="input"
            />
            <span className="text-ink-200 text-[10px]" aria-hidden>
              —
            </span>
            <input
              type="number"
              placeholder="Max"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onBlur={() => update('maxPrice', maxPrice || null)}
              className="input"
            />
          </div>
        </div>

        {/* Clear */}
        {hasFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-[11px] font-mono uppercase tracking-[0.12em] text-ink-100 hover:text-danger transition-colors border border-ink-400"
          >
            <X size={12} aria-hidden />
            Xoá bộ lọc
          </button>
        )}
      </div>
    </div>
  )
}
