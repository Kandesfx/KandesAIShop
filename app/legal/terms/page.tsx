import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản sử dụng dịch vụ của Kandes.shop.',
}

export default function TermsPage() {
  return (
    <div className="container-narrow mx-auto py-16 px-4">
      <h1 className="text-display-md font-display mb-8">Điều khoản sử dụng</h1>
      <div className="prose prose-invert max-w-none space-y-6 text-ink-100">
        <p>Cập nhật lần cuối: August 5, 2026</p>

        <section>
          <h2>1. Dịch vụ</h2>
          <p>
            Kandes.shop cung cấp công cụ AI coding (Cursor Pro, Windsurf, Claude Pro, GitHub Copilot,
            Codex, v.v.) dưới dạng tài khoản thuê bao. Tài khoản được giao tự động qua email
            trong vòng 30 giây sau khi thanh toán thành công.
          </p>
        </section>

        <section>
          <h2>2. Thanh toán</h2>
          <p>
            Thanh toán qua chuyển khoản ngân hàng với QR code (SePay). Đơn hàng có hiệu lực sau
            khi xác nhận thanh toán. Không hỗ trợ hoàn tiền sau 7 ngày kể từ khi nhận tài khoản.
          </p>
        </section>

        <section>
          <h2>3. Tài khoản AI</h2>
          <p>
            Tài khoản AI được cấp từ nhà cung cấp bên thứ ba. Kandes.shop không kiểm soát chính
            sách của nhà cung cấp đó. Tài khoản có thể hết hạn hoặc bị thu hồi theo điều khoản
            của nhà cung cấp.
          </p>
        </section>

        <section>
          <h2>4. Trách nhiệm</h2>
          <p>
            Kandes.shop không chịu trách nhiệm về việc nhà cung cấp thay đổi giá, ngừng cung cấp,
            hoặc thay đổi điều khoản dịch vụ. Chúng tôi cam kết thông báo nếu có thay đổi lớn.
          </p>
        </section>

        <section>
          <h2>5. Liên hệ</h2>
          <p>
            Câu hỏi:{' '}
            <a href="mailto:support@kandes.shop" className="text-electric underline">
              support@kandes.shop
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}