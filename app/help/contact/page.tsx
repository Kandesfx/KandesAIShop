import { ContactForm } from '@/components/public/contact-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Liên hệ · Kandes.shop',
  description: 'Gửi câu hỏi hoặc yêu cầu hỗ trợ — phản hồi trong 24h làm việc.',
}

export default function HelpContactPage() {
  return (
    <div className="container-narrow py-12 lg:py-16 space-y-8">
      <header className="space-y-3 pb-6 border-b border-ink-400">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-sky-400 font-semibold">
          [ HELP / CONTACT ]
        </span>
        <h1 className="text-display-lg font-display text-ink-50">
          Liên hệ
          <span className="text-sky-400">.</span>
        </h1>
        <p className="text-body-lg text-ink-100 max-w-xl">
          Gửi thông tin bên dưới — team sẽ phản hồi trong vòng 24h làm việc (T2–T6).
        </p>
      </header>

      <ContactForm />
    </div>
  )
}
