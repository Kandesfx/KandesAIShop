'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
        <div className="container-narrow py-20 flex flex-col items-center justify-center text-center">
          <span className="inline-block mb-4 px-3 py-1 border border-electric/40 bg-electric/5 text-electric text-[10px] font-mono uppercase tracking-[0.2em]">
            ERR / 500
          </span>
          <h2 className="text-display-lg font-display mb-4">Đã có sự cố</h2>
          <p className="text-body text-ink-100 mb-6 max-w-md">
            Đã xảy ra lỗi khi tải trang này. Vui lòng thử lại.
          </p>
          <div className="flex gap-3">
            <Button onClick={reset}>Thử lại</Button>
            <Link href="/">
              <Button variant="outline">Về trang chủ</Button>
            </Link>
          </div>
        </div>
  )
}
