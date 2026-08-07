'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * NavLink with active route highlight.
 * Client component để dùng usePathname — tránh đổi cả header thành client.
 */
export function NavLink({ href, children, className }: NavLinkProps) {
  const pathname = usePathname()

  // Active nếu pathname === href, hoặc pathname bắt đầu bằng href (cho category URLs)
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

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
