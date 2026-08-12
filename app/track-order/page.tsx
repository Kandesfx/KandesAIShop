import Link from 'next/link'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { TrackOrderForm } from '@/components/checkout/track-order-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tra cứu đơn hàng · Kandes.shop',
  description: 'Tra cứu đơn hàng không cần đăng nhập',
}

/**
 * /track-order — Phase 2 P2-08.
 *
 * Trang tra cứu cho guest (và cả user — thoải mái dùng). Form client submit
 * qua /api/orders/track → redirect sang /order/[orderNumber] để có đầy đủ
 * QR + countdown + polling.
 *
 * Không cần auth.
 */
export default function TrackOrderPage() {
  return (
    <div className="bg-ink-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <span className="inline-block tech-tag">ORDER · TRACK</span>
          <div>
            <h1 className="text-display-lg font-display">Tra cứu đơn hàng</h1>
            <p className="text-body-sm text-ink-100 mt-1">
              Nhập mã đơn cùng email hoặc SĐT đã dùng khi đặt hàng
            </p>
          </div>
        </div>

        <Card className="p-6 space-y-4">
          <TrackOrderForm />
        </Card>

        <div className="text-center text-body-sm text-ink-100 space-y-1">
          <p>
            <Link href="/track-order" className="text-electric hover:underline">
              <Search size={12} className="inline" aria-hidden /> Tra cứu nhanh
            </Link>
          </p>
          <p>
            <Link href="/" className="text-ink-200 hover:text-electric">
              ← Về trang chủ
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
