import { faqService } from '@/modules/faq'
import { FaqAccordion } from '@/components/public/faq-accordion'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'FAQ · Kandes.shop',
  description: 'Câu hỏi thường gặp về thanh toán, giao hàng, tài khoản.',
}

export default async function HelpFaqPage() {
  const faqs = await faqService.listPublished()

  const grouped = new Map<string, typeof faqs>()
  for (const f of faqs) {
    const arr = grouped.get(f.category) ?? []
    arr.push(f)
    grouped.set(f.category, arr)
  }

  const CATEGORY_LABELS: Record<string, string> = {
    general: 'Chung',
    payment: 'Thanh toán',
    delivery: 'Giao hàng',
    account: 'Tài khoản',
    refund: 'Hoàn tiền',
    technical: 'Kỹ thuật',
  }

  return (
    <div className="container-narrow py-16 lg:py-24 space-y-10">
      <header className="space-y-4 pb-8 border-b border-ink-400">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ HELP / FAQ ]
        </span>
        <h1 className="text-display-lg font-display">
          Câu hỏi thường gặp
          <span className="text-electric">.</span>
        </h1>
        <p className="text-body-lg text-ink-100 max-w-xl">
          Không tìm thấy câu trả lời? Liên hệ trực tiếp{' '}
          <a href="/help/contact" className="text-electric underline">
            tại đây
          </a>
          .
        </p>
      </header>

      {faqs.length === 0 ? (
        <p className="text-ink-200 text-[12px]">Hiện chưa có FAQ nào.</p>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <section key={cat} className="space-y-3">
              <h2 className="text-display-sm font-display text-ink-50 uppercase tracking-wide">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <FaqAccordion items={items} />
            </section>
          ))}
        </div>
      )}

      {/* Zalo Direct Support & Community Card */}
      <div className="mt-12 p-6 border border-ink-700/80 bg-ink-900/90 rounded-xl space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-electric/10 via-plasma/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <h3 className="text-base font-display font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-electric animate-pulse-dot" />
            Cần hỗ trợ trực tiếp nhanh chóng?
          </h3>

          <div className="space-y-2.5 text-body-sm text-ink-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-ink-200">💬 Bạn có thể liên hệ ngay qua Zalo để được hỗ trợ chi tiết qua số Zalo:</span>
              <a
                href="https://zalo.me/0865834117"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-bold text-electric hover:underline inline-flex items-center gap-1 w-fit bg-electric/10 px-2 py-0.5 rounded border border-electric/30"
              >
                0865834117
              </a>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-ink-200">👥 Tham gia nhóm cộng đồng để nhận được thông báo, hỗ trợ mới nhất:</span>
              <a
                href="https://zalo.me/g/1wpnubuk0nzczx5n8jbl"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-electric hover:underline break-all inline-flex items-center gap-1 w-fit"
              >
                https://zalo.me/g/1wpnubuk0nzczx5n8jbl
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
