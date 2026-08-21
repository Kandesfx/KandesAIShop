import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
  searchParams: Record<string, string | undefined>
}

export function Pagination({ currentPage, totalPages, basePath, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null

  const buildHref = (page: number) => {
    const params = new URLSearchParams()
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    if (page > 1) params.set('page', String(page))
    const q = params.toString()
    return q ? `${basePath}?${q}` : basePath
  }

  const prev = currentPage > 1 ? buildHref(currentPage - 1) : null
  const next = currentPage < totalPages ? buildHref(currentPage + 1) : null

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2 mt-12 pt-8 border-t border-ink-400">
      <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-200">
        TRANG {String(currentPage).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
      </span>

      <div className="flex items-center gap-1">
        {prev ? (
          <Link
            href={prev}
            className="px-3 py-1.5 border border-ink-400 hover:border-electric hover:text-electric transition-colors text-[12px] font-mono uppercase tracking-[0.12em]"
          >
            <ChevronLeft size={12} className="inline mr-1" /> PREV
          </Link>
        ) : (
          <span className="px-3 py-1.5 border border-ink-400/30 text-ink-200/40 text-[12px] font-mono uppercase tracking-[0.12em] cursor-not-allowed">
            <ChevronLeft size={12} className="inline mr-1" /> PREV
          </span>
        )}

        {/* Numbered */}
        <div className="hidden sm:flex items-center gap-1 mx-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => {
              const prevP = arr[idx - 1]
              const isGap = prevP !== undefined && p - prevP > 1
              return (
                <span key={p} className="inline-flex items-center">
                  {isGap && <span className="px-1 text-ink-200">…</span>}
                  <Link
                    href={buildHref(p)}
                    className={`min-w-[2rem] text-center px-2 py-1.5 text-[12px] font-mono ${
                      p === currentPage
                        ? 'bg-electric text-ink-900'
                        : 'border border-ink-400 text-ink-100 hover:border-electric hover:text-electric'
                    }`}
                  >
                    {p}
                  </Link>
                </span>
              )
            })}
        </div>

        {next ? (
          <Link
            href={next}
            className="px-3 py-1.5 border border-ink-400 hover:border-electric hover:text-electric transition-colors text-[12px] font-mono uppercase tracking-[0.12em]"
          >
            NEXT <ChevronRight size={12} className="inline ml-1" />
          </Link>
        ) : (
          <span className="px-3 py-1.5 border border-ink-400/30 text-ink-200/40 text-[12px] font-mono uppercase tracking-[0.12em] cursor-not-allowed">
            NEXT <ChevronRight size={12} className="inline ml-1" />
          </span>
        )}
      </div>
    </nav>
  )
}
