import { ContactForm } from '@/components/public/contact-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Liên hệ · Kandes.shop',
  description: 'Gửi câu hỏi hoặc yêu cầu hỗ trợ — phản hồi trong 24h làm việc.',
}

export default function HelpContactPage() {
  return (
    <div className="container-narrow py-12 space-y-8">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ HELP / CONTACT ]
        </span>
        <h1 className="text-display-lg font-display">
          Liên hệ
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200 max-w-xl">
          Gửi thông tin bên dưới — team sẽ phản hồi trong vòng 24h làm việc (T2–T6).
        </p>
      </div>

      <ContactForm />
    </div>
  )
}
