'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Cart page error state — DB down hoặc cart không tải được.
 * Dùng router.refresh() thay vì full page reload để UX mượt hơn
 * khi DB recover.
 */
export function CartErrorState() {
  const router = useRouter()

  return (
    <div className="text-center py-16 space-y-4">
      <p className="text-h3 text-ink-100">Không thể tải giỏ hàng</p>
      <p className="text-ink-300 text-body">
        Hệ thống đang bận. Vui lòng làm mới trang hoặc thử lại sau.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={() => router.refresh()} variant="primary">
          LÀM MỚI
        </Button>
        <Link href="/">
          <Button variant="outline">Về trang chủ</Button>
        </Link>
      </div>
    </div>
  )
}
