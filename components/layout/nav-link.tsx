'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * NavLink with active route highlight.
 * Client component để dùng usePathname/useSearchParams — tránh đổi cả header thành client.
 *
 * Hỗ trợ nav items có query string (vd "/products?category=ai-code"):
 *   - pathname phải khớp path
 *   - các query params phải khớp đúng (extra params OK)
 */
export function NavLink({ href, children, className }: NavLinkProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [path, query] = href.split('?')
  const pathMatches = pathname === path
  const queryMatches = !query
    ? true
    : Array.from(new URLSearchParams(query)).every(
        ([key, value]) => searchParams.get(key) === value
      )
  const isActive = pathMatches && queryMatches

  return (
    <Link
      href={href}
      className={cn(
        'group relative px-4 py-2 text-[13px] font-medium hover:text-electric transition-colors',
        isActive ? 'text-electric' : 'text-ink-100',
        className
      )}
    >
      {children}
      <span
        className={cn(
          'absolute left-4 right-4 -bottom-0.5 h-px bg-electric transition-transform duration-fast',
          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 origin-left'
        )}
      />
    </Link>
  )
}
