'use client'

import { useRouter } from 'next/navigation'

/**
 * "Xoá bộ lọc" button — resets all URL params to /products.
 * Used in empty state of /products page.
 */
export function ClearFiltersButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push('/products')}
      className="inline-flex px-4 py-2 border border-ink-300 hover:border-electric hover:text-electric text-[12px] font-mono uppercase tracking-[0.12em] transition-colors"
    >
      Xoá bộ lọc
    </button>
  )
}
