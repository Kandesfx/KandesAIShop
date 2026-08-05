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
    <div className="container-narrow py-12 space-y-8">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ HELP / FAQ ]
        </span>
        <h1 className="text-display-lg font-display">
          Câu hỏi thường gặp
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200 max-w-xl">
          Không tìm thấy câu trả lời? Liên hệ trực tiếp{' '}
          <a href="/help/contact" className="text-electric underline">
            tại đây
          </a>
          .
        </p>
      </div>

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
    </div>
  )
}
