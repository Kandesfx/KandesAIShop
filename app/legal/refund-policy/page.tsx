import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chính sách hoàn tiền',
  description: 'Chính sách hoàn tiền của Kandes.shop.',
}

export default function RefundPolicyPage() {
  return (
    <div className="container-narrow mx-auto py-16 px-4">
      <h1 className="text-display-md font-display mb-8">Chính sách hoàn tiền</h1>
      <div className="prose prose-invert max-w-none space-y-6 text-ink-100">
        <p>Cập nhật lần cuối: August 5, 2026</p>

        <section>
          <h2>1. Hoàn tiền trong 7 ngày</h2>
          <p>
            Nếu tài khoản AI không giao trong 48 giờ sau khi thanh toán, bạn có quyền yêu cầu
            hoàn tiền đầy đủ. Liên hệ qua{' '}
            <a href="/help/contact" className="text-electric underline">
              trang liên hệ
            </a>{' '}
            kèm mã đơn hàng.
          </p>
        </section>

        <section>
          <h2>2. Không hoàn tiền sau khi nhận tài khoản</h2>
          <p>
            Sau khi tài khoản AI đã được giao và xác nhận (qua email hoặc trang theo dõi),
            chúng tôi không hoàn tiền vì tài khoản đã được sử dụng.
          </p>
        </section>

        <section>
          <h2>3. Tài khoản không hoạt động</h2>
          <p>
            Nếu nhà cung cấp thu hồi tài khoản trong vòng 7 ngày kể từ khi giao, chúng tôi
            sẽ cấp tài khoản thay thế hoặc hoàn tiền.
          </p>
        </section>

        <section>
          <h2>4. Thời gian xử lý</h2>
          <p>Hoàn tiền qua chuyển khoản ngân hàng trong vòng 5-7 ngày làm việc.</p>
        </section>
      </div>
    </div>
  )
}