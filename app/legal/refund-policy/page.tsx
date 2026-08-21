import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chính sách hoàn tiền',
  description: 'Chính sách hoàn tiền của Kandes.shop.',
}

export default function RefundPolicyPage() {
  return (
    <div className="container-narrow mx-auto py-16 lg:py-24 px-4">
      <header className="space-y-4 mb-12 pb-8 border-b border-ink-400">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ LEGAL · REFUND ]
        </span>
        <h1 className="text-display-lg font-display">
          Chính sách hoàn tiền
          <span className="text-electric">.</span>
        </h1>
        <p className="text-body-sm text-ink-200">Cập nhật lần cuối: August 5, 2026</p>
      </header>

      <article className="prose prose-invert max-w-none space-y-8 text-ink-100">
        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">1. Hoàn tiền trong 7 ngày</h2>
          <p className="text-body leading-relaxed">
            Nếu tài khoản AI không giao trong 48 giờ sau khi thanh toán, bạn có quyền yêu cầu
            hoàn tiền đầy đủ. Liên hệ qua{' '}
            <a href="/help/contact" className="text-electric underline">
              trang liên hệ
            </a>{' '}
            kèm mã đơn hàng.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">
            2. Không hoàn tiền sau khi nhận tài khoản
          </h2>
          <p className="text-body leading-relaxed">
            Sau khi tài khoản AI đã được giao và xác nhận (qua email hoặc trang theo dõi), chúng
            tôi không hoàn tiền vì tài khoản đã được sử dụng.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">3. Tài khoản không hoạt động</h2>
          <p className="text-body leading-relaxed">
            Nếu nhà cung cấp thu hồi tài khoản trong vòng 7 ngày kể từ khi giao, chúng tôi sẽ
            cấp tài khoản thay thế hoặc hoàn tiền.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-display text-ink-50 mb-3">4. Thời gian xử lý</h2>
          <p className="text-body leading-relaxed">
            Hoàn tiền qua chuyển khoản ngân hàng trong vòng 5-7 ngày làm việc.
          </p>
        </section>
      </article>
    </div>
  )
}