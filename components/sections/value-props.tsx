import { Zap, ShieldCheck, MessageCircle, RefreshCw } from 'lucide-react'

const PROPS = [
  {
    icon: Zap,
    code: '01',
    title: 'Giao tự động',
    desc: 'Thanh toán QR xong là có key trong email trong vòng 30 giây. Không chờ đợi, không thủ tục.',
  },
  {
    icon: ShieldCheck,
    code: '02',
    title: 'Chính hãng 100%',
    desc: 'Key từ nhà cung cấp uy tín. Đổi trả 1-đổi-1 nếu key lỗi trong 24 giờ đầu.',
  },
  {
    icon: MessageCircle,
    code: '03',
    title: 'Hỗ trợ 24/7',
    desc: 'Admin sẵn sàng qua Telegram, Zalo. Với đơn cảnh báo, có cả gọi điện tự động.',
  },
  {
    icon: RefreshCw,
    code: '04',
    title: 'Tự động hoàn toàn',
    desc: 'Từ QR thanh toán đến email giao hàng — toàn bộ tự động. Bạn chỉ cần chờ 30 giây.',
  },
]

export function ValueProps() {
  return (
    <section className="relative py-24 lg:py-32 border-t border-ink-400">
      <div className="container-narrow">
        {/* Header */}
        <div className="mb-12 pb-6 border-b border-ink-400 space-y-2">
<span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
              [ 04 / TẠI SAO CHỌN KANDES ]
            </span>
          <h2 className="text-display-lg font-display max-w-2xl">
            Đơn giản, minh bạch,
            <br />
            <span className="text-electric">đúng cam kết.</span>
          </h2>
        </div>

        {/* Numbered list */}
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink-400 border border-ink-400">
          {PROPS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.title} className="bg-ink-800 p-8 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <Icon size={24} strokeWidth={1.5} className="text-electric" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-200">
                    /{item.code}
                  </span>
                </div>
                <h3 className="text-h3 font-display text-ink-50">{item.title}</h3>
                <p className="text-[14px] text-ink-100 leading-relaxed">{item.desc}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
