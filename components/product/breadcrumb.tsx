import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        return (
          <span key={idx} className="inline-flex items-center gap-1.5">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-electric transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-electric' : ''}>{item.label}</span>
            )}
            {!isLast && <ChevronRight size={10} strokeWidth={1.5} className="opacity-50" />}
          </span>
        )
      })}
    </nav>
  )
}
