'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode, MouseEvent } from 'react'

interface ClickableRowProps {
  href: string
  children: ReactNode
  className?: string
}

/**
 * Wrapper cho <tr> để click vào bất kỳ đâu trên row đều navigate tới href.
 * Nếu click vào <a> hoặc <button> bên trong thì KHÔNG navigate (để nút thao tác hoạt động bình thường).
 */
export function ClickableRow({ href, children, className }: ClickableRowProps) {
  const router = useRouter()

  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    // Nếu click vào link hoặc button bên trong thì không navigate
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button')) return

    router.push(href)
  }

  return (
    <tr onClick={handleClick} className={className} style={{ cursor: 'pointer' }}>
      {children}
    </tr>
  )
}
