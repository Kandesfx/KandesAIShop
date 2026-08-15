import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminNotFound() {
  return (
    <div className="container-narrow py-24 flex flex-col items-center justify-center text-center">
      <span className="inline-block mb-4 px-3 py-1 border border-electric/40 bg-electric/5 text-electric text-[10px] font-mono uppercase tracking-[0.2em]">
        404 / NOT FOUND
      </span>
      <h1 className="text-h1 font-display mb-4">Trang không tồn tại</h1>
      <p className="text-body text-ink-100 mb-8 max-w-md">
        Đường dẫn admin này không tồn tại. Có thể đã bị đổi hoặc xoá.
      </p>
      <Link href="/manage">
        <Button>Về tổng quan</Button>
      </Link>
    </div>
  )
}
