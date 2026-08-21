'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container-narrow py-20 flex flex-col items-center justify-center text-center">
      <span className="inline-block mb-4 px-3 py-1 border border-danger/40 bg-danger/10 text-danger text-[11px] font-mono uppercase tracking-[0.2em]">
        ERR / 500
      </span>
      <h2 className="text-display-lg font-display mb-4">Đã có sự cố</h2>
      <p className="text-body text-ink-100 mb-2 max-w-md">
        Không tải được trang admin. Có thể do kết nối database hoặc lỗi hệ thống.
      </p>
      {error.digest && (
        <p className="text-[11px] font-mono text-ink-100 mb-6">
          digest: {error.digest}
        </p>
      )}
      <div className="flex gap-3 mt-4">
        <Button onClick={reset}>Thử lại</Button>
        <Link href="/manage">
          <Button variant="outline">Về tổng quan</Button>
        </Link>
      </div>
    </div>
  )
}
