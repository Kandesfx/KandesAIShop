'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="vi">
      <body className="bg-ink-900 text-ink-50">
        <div className="container-narrow py-24 md:py-32 flex flex-col items-center justify-center text-center min-h-screen">
          <span className="inline-block mb-4 px-3 py-1 border border-danger/40 bg-danger/10 text-danger text-[10px] font-mono uppercase tracking-[0.2em]">
            ERR-500 {error.digest ? `· ${error.digest.slice(0, 8)}` : ''}
          </span>
          <h1 className="text-display-lg font-display mb-4">Đã có sự cố</h1>
          <p className="text-body-lg text-ink-100 mb-8 max-w-md">
            Hệ thống gặp lỗi bất ngờ. Chúng tôi đã ghi nhận và đang xử lý.
          </p>
          <div className="flex gap-3">
            <Button onClick={reset}>Thử lại</Button>
            <Link href="/">
              <Button variant="outline">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
