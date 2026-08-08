import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description:
    'Chính sách bảo mật của Kandes.shop — cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.',
}

export default function PrivacyPage() {
  return (
    <div className="container-narrow mx-auto py-16 lg:py-24 px-4">
      <header className="space-y-4 mb-12 pb-8 border-b border-ink-400">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ LEGAL · PRIVACY ]
        </span>
        <h1 className="text-display-lg font-display">
          Chính sách bảo mật
          <span className="text-electric">.</span>
        </h1>
        <p className="text-body-sm text-ink-200">Cập nhật lần cuối: August 5, 2026</p>
      </header>

      <article className="prose prose-invert max-w-none space-y-8 text-ink-100">
        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">1. Dữ liệu chúng tôi thu thập</h2>
          <p className="text-body leading-relaxed">
            Kandes.shop thu thập thông tin bạn cung cấp trực tiếp: email, tên, mật khẩu (đã hash
            argon2id), số điện thoại (nếu có), và lịch sử đơn hàng. Chúng tôi không bán dữ liệu
            cá nhân cho bên thứ ba.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">2. Cookies</h2>
          <p className="text-body leading-relaxed">
            Cookies cần thiết: xác thực, giỏ hàng, bảo mật. Cookies phân tích (Plausible
            Analytics): không thu thập dữ liệu cá nhân, không dùng cookies, tuân thủ GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">3. Lưu trữ và bảo mật</h2>
          <p className="text-body leading-relaxed">
            Dữ liệu được lưu trữ trên PostgreSQL với mật khẩu đã hash (argon2id). API keys mã hóa
            AES-256-GCM. Giao dịch thanh toán qua SePay — chúng tôi không lưu thông tin thẻ.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">4. Quyền của bạn</h2>
          <p className="text-body leading-relaxed">
            Bạn có quyền truy cập, chỉnh sửa, và xóa dữ liệu cá nhân. Gửi yêu cầu qua{' '}
            <a href="/help/contact" className="text-electric underline">
              trang liên hệ
            </a>{' '}
            hoặc email{' '}
            <a href="mailto:privacy@kandes.shop" className="text-electric underline">
              privacy@kandes.shop
            </a>
            . Chúng tôi xử lý trong 72 giờ.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">5. Thời gian lưu trữ</h2>
          <p className="text-body leading-relaxed">
            Tài khoản: lưu đến khi bạn xóa. Đơn hàng: 5 năm theo quy định kế toán. Logs: 90
            ngày. Backup: 30 ngày.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">6. Bên thứ ba</h2>
          <p className="text-body leading-relaxed">
            SePay (thanh toán), Resend (email), Twilio/Telegram/Zalo (thông báo). Mỗi bên có
            chính sách bảo mật riêng.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">7. Liên hệ</h2>
          <p className="text-body leading-relaxed">
            Câu hỏi về bảo mật:{' '}
            <a href="mailto:privacy@kandes.shop" className="text-electric underline">
              privacy@kandes.shop
            </a>
          </p>
        </section>
      </article>
    </div>
  )
}