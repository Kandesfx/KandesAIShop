import 'dotenv/config'

process.env.EMAIL_FROM = 'Kandes Shop <no-reply@kandes.shop>'

import { sendEmail, otpEmail, passwordResetEmail } from '../lib/email'
import { resolveTemplate } from '../modules/notification/templates'

const TARGET_EMAIL = 'kaitokit139@gmail.com'

async function runTests() {
  console.log(`\n📧 BẮT ĐẦU TEST GỬI EMAIL TỚI: ${TARGET_EMAIL}\n`)
  console.log(`Email Provider: ${process.env.EMAIL_PROVIDER || 'console'}`)
  console.log(`Email From: ${process.env.EMAIL_FROM || 'Kandes Shop <no-reply@kandes.shop>'}\n`)

  // 1. Test OTP Email
  try {
    console.log('1️⃣ Gửi thử Email OTP xác thực...')
    const otp = otpEmail('889966', 'login')
    await sendEmail({
      to: TARGET_EMAIL,
      subject: otp.subject,
      html: otp.html,
      text: otp.text,
    })
    console.log('   ✅ Đã gửi Email OTP thành công!')
  } catch (err) {
    console.error('   ❌ Lỗi gửi OTP Email:', err)
  }

  // 2. Test Password Reset Email
  try {
    console.log('\n2️⃣ Gửi thử Email Đặt lại mật khẩu...')
    const reset = passwordResetEmail('https://kandes.shop/reset-password?token=demo-test-token-123456', new Date(Date.now() + 15 * 60 * 1000))
    await sendEmail({
      to: TARGET_EMAIL,
      subject: reset.subject,
      html: reset.html,
      text: reset.text,
    })
    console.log('   ✅ Đã gửi Email Đặt lại mật khẩu thành công!')
  } catch (err) {
    console.error('   ❌ Lỗi gửi Password Reset Email:', err)
  }

  // 3. Test Order Delivered (Giao hàng / License Key)
  try {
    console.log('\n3️⃣ Gửi thử Email Bàn giao Đơn hàng & License Key (order.delivered)...')
    const template = resolveTemplate('order.delivered', {
      orderNumber: 'KDS-TEST-8899',
      totalCents: '24000000',
      currency: 'VND',
      items: [
        {
          name: 'Cursor Pro — Gói 1 Tháng (Chính Hãng)',
          quantity: 1,
          unitPriceCents: '24000000',
        },
      ],
      deliveredContentKeys: true,
    })

    if (template) {
      await sendEmail({
        to: TARGET_EMAIL,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })
      console.log('   ✅ Đã gửi Email Bàn giao Đơn hàng thành công!')
    }
  } catch (err) {
    console.error('   ❌ Lỗi gửi Order Delivered Email:', err)
  }

  // 4. Test Customer Support Reply (Email phản hồi hỗ trợ khách hàng)
  try {
    console.log('\n4️⃣ Gửi thử Email Phản hồi Hỗ trợ Khách hàng (Support Reply)...')
    await sendEmail({
      to: TARGET_EMAIL,
      subject: '[Kandes.shop Support] Phản hồi yêu cầu hỗ trợ #SUP-9921',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: #0B0D14; padding: 20px 24px; border-bottom: 2px solid #00E5FF;">
            <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">
              KANDES<span style="color: #00E5FF;">.SHOP</span> <span style="font-size: 12px; color: #9CA3AF; font-weight: normal;">· SUPPORT DESK</span>
            </h2>
          </div>
          <div style="padding: 24px; color: #1F2937; line-height: 1.6; font-size: 14px;">
            <p>Xin chào quý khách <strong>kaitokit139</strong>,</p>
            <p>Đội ngũ Chăm sóc khách hàng của <strong>Kandes.shop</strong> đã tiếp nhận và phản hồi yêu cầu hỗ trợ của bạn liên quan đến dịch vụ:</p>
            
            <div style="background: #F3F4F6; border-left: 4px solid #00E5FF; padding: 14px 16px; margin: 18px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; font-style: italic; color: #4B5563;">
                "Tài khoản và cấu hình của bạn đã được kích hoạt thành công trên hệ thống Kandes AI Gateway. Bạn có thể bắt đầu sử dụng ngay lập tức."
              </p>
            </div>

            <p>Nếu bạn cần thêm bất kỳ trợ giúp nào, vui lòng trả lời trực tiếp email này hoặc liên hệ qua Telegram: <a href="https://t.me/kandes_support" style="color: #00E5FF; text-decoration: none; font-weight: 600;">@kandes_support</a>.</p>
            
            <p style="margin-top: 24px; margin-bottom: 0;">Trân trọng,<br><strong>Kandes Support Team</strong></p>
          </div>
          <div style="background: #F9FAFB; padding: 14px 24px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 12px; color: #6B7280;">
            © 2026 Kandes.shop · Nền tảng công cụ AI Coding bản quyền 30 giây.
          </div>
        </div>
      `,
      text: 'Xin chào kaitokit139,\n\nĐội ngũ Kandes.shop đã tiếp nhận yêu cầu hỗ trợ của bạn.\nTài khoản của bạn đã được kích hoạt thành công trên hệ thống Kandes AI Gateway.\n\nTrân trọng,\nKandes Support Team',
    })
    console.log('   ✅ Đã gửi Email Phản hồi Hỗ trợ Khách hàng thành công!')
  } catch (err) {
    console.error('   ❌ Lỗi gửi Support Reply Email:', err)
  }

  console.log('\n🎉 HOÀN TẤT KIỂM TRA EMAIL!')
}

runTests()
