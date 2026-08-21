import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản sử dụng dịch vụ của Kandes.shop.',
}

export default function TermsPage() {
  return (
    <div className="container-narrow mx-auto py-16 lg:py-24 px-4">
      <header className="space-y-4 mb-12 pb-8 border-b border-ink-400">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ LEGAL · TERMS ]
        </span>
        <h1 className="text-display-lg font-display">
          Điều khoản sử dụng
          <span className="text-electric">.</span>
        </h1>
        <p className="text-body-sm text-ink-200">Cập nhật lần cuối: August 5, 2026</p>
      </header>

      <article className="prose prose-invert max-w-none space-y-8 text-ink-100">
        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">1. Dịch vụ</h2>
          <p className="text-body leading-relaxed">
            Kandes.shop cung cấp công cụ AI coding (Cursor Pro, Windsurf, Claude Pro, GitHub
            Copilot, Codex, v.v.) dưới dạng tài khoản thuê bao. Tài khoản được giao tự động qua
            email trong vòng 30 giây sau khi thanh toán thành công.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">2. Thanh toán</h2>
          <p className="text-body leading-relaxed">
            Thanh toán qua chuyển khoản ngân hàng với QR code (SePay). Đơn hàng có hiệu lực sau
            khi xác nhận thanh toán. Không hỗ trợ hoàn tiền sau 7 ngày kể từ khi nhận tài khoản.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">3. Tài khoản AI</h2>
          <p className="text-body leading-relaxed">
            Tài khoản AI được cấp từ nhà cung cấp bên thứ ba. Kandes.shop không kiểm soát chính
            sách của nhà cung cấp đó. Tài khoản có thể hết hạn hoặc bị thu hồi theo điều khoản
            của nhà cung cấp.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">4. Trách nhiệm</h2>
          <p className="text-body leading-relaxed">
            Kandes.shop không chịu trách nhiệm về việc nhà cung cấp thay đổi giá, ngừng cung cấp,
            hoặc thay đổi điều khoản dịch vụ. Chúng tôi cam kết thông báo nếu có thay đổi lớn.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">5. Liên hệ</h2>
          <p className="text-body leading-relaxed">
            Câu hỏi:{' '}
            <a href="mailto:support@kandes.shop" className="text-electric underline">
              support@kandes.shop
            </a>
          </p>
        </section>
      </article>
    </div>
  )
}