import { ShieldCheck, Clock, Zap, RotateCcw } from 'lucide-react'

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Bảo hành 30 ngày', sub: 'Đổi mới nếu lỗi' },
  { icon: Clock, label: 'Hỗ trợ 24/7', sub: 'Telegram / Zalo' },
  { icon: Zap, label: 'Giao hàng tức thì', sub: '≤ 30 giây tự động' },
  { icon: RotateCcw, label: 'Hoàn tiền 100%', sub: 'Nếu không đúng mô tả' },
]

/**
 * TrustBlock — Phase 9 D5.
 *
 * Static badges hiển thị cam kết dịch vụ, đặt ở PDP sidebar để tăng trust
 * signal trước khi khách quyết định mua.
 */
export function TrustBlock() {
  return (
    <div className="grid grid-cols-2 gap-px bg-ink-400 border border-ink-400">
      {TRUST_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className="bg-ink-800 p-3 space-y-1.5">
            <Icon size={16} strokeWidth={1.5} className="text-electric" aria-hidden />
            <div className="text-[12px] font-medium text-ink-50 leading-tight">
              {item.label}
            </div>
            <div className="text-[11px] text-ink-200 leading-tight">{item.sub}</div>
          </div>
        )
      })}
    </div>
  )
}