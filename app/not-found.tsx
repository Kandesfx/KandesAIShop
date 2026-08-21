import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container-narrow py-24 md:py-32 flex flex-col items-center justify-center text-center">
      <span className="inline-block mb-4 px-3 py-1 border border-electric/40 bg-electric/5 text-electric text-[11px] font-mono uppercase tracking-[0.2em]">
        404 / NOT FOUND
      </span>
      <h1 className="text-display-lg font-display mb-4">Không tìm thấy trang</h1>
      <p className="text-body-lg text-ink-100 mb-8 max-w-md">
        Đường dẫn này có thể đã thay đổi hoặc sản phẩm đã được điều chỉnh. Quay về trang chủ nhé.
      </p>
      <Link href="/">
        <Button size="lg">Về trang chủ</Button>
      </Link>
    </div>
  )
}
