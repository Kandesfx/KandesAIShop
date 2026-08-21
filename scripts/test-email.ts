import 'dotenv/config'

process.env.EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'Kandes Shop <no-reply@kandes.shop>'

import { sendEmail, otpEmail, passwordResetEmail } from '../lib/email'
import { resolveTemplate } from '../modules/notification/templates'
import { renderSupportReplyCorporateEmail } from '../lib/email-templates'

const TARGET_EMAIL = 'kaitokit139@gmail.com'

async function runTests() {
  console.log(`\n===============================================================`)
  console.log(`📧 BẮT ĐẦU GỬI TEST BỘ EMAIL DOANH NGHIỆP TỚI: ${TARGET_EMAIL}`)
  console.log(`Provider: ${process.env.EMAIL_PROVIDER} | From: ${process.env.EMAIL_FROM}`)
  console.log(`===============================================================\n`)

  // 1. Test OTP Email
  try {
    console.log('1️⃣ Đang gửi Email 1: Mã xác thực OTP (Đăng nhập / Xác thực)...')
    const otp = otpEmail('889966', 'login')
    await sendEmail({
      to: TARGET_EMAIL,
      subject: otp.subject,
      html: otp.html,
      text: otp.text,
    })
    console.log('   ✅ Đã gửi thành công Email 1: OTP')
  } catch (err) {
    console.error('   ❌ Lỗi gửi Email 1:', err)
  }

  // 2. Test Password Reset Email
  try {
    console.log('\n2️⃣ Đang gửi Email 2: Đặt lại mật khẩu tài khoản...')
    const reset = passwordResetEmail(
      'https://kandes.shop/reset-password?token=demo-token-security-8888',
      new Date(Date.now() + 15 * 60 * 1000)
    )
    await sendEmail({
      to: TARGET_EMAIL,
      subject: reset.subject,
      html: reset.html,
      text: reset.text,
    })
    console.log('   ✅ Đã gửi thành công Email 2: Reset Password')
  } catch (err) {
    console.error('   ❌ Lỗi gửi Email 2:', err)
  }

  // 3. Test Order Paid & Processing (Xác nhận thanh toán & Đang xử lý)
  try {
    console.log('\n3️⃣ Đang gửi Email 3: Xác nhận thanh toán & Đang xử lý (order.paid)...')
    const paidTpl = resolveTemplate('order.paid', {
      orderNumber: 'KDS-20260821-8899',
      totalCents: '35000',
      currency: 'VND',
      items: [
        {
          name: 'Cursor Pro — Gói 1 Ngày (400 requests / ngày)',
          quantity: 1,
          unitPriceCents: '35000',
        },
      ],
    })

    if (paidTpl) {
      await sendEmail({
        to: TARGET_EMAIL,
        subject: paidTpl.subject,
        html: paidTpl.html,
        text: paidTpl.text,
      })
      console.log('   ✅ Đã gửi thành công Email 3: Order Paid & Processing')
    }
  } catch (err) {
    console.error('   ❌ Lỗi gửi Email 3:', err)
  }

  // 4. Test Order Delivered (Bàn giao License Key)
  try {
    console.log('\n4️⃣ Đang gửi Email 4: Bàn giao License Key (order.delivered)...')
    const deliveredTpl = resolveTemplate('order.delivered', {
      orderNumber: 'KDS-20260821-8899',
      totalCents: '35000',
      currency: 'VND',
      items: [
        {
          name: 'Cursor Pro — Gói 1 Ngày (400 requests / ngày)',
          quantity: 1,
          unitPriceCents: '35000',
        },
      ],
      deliveredContentKeys: true,
    })

    if (deliveredTpl) {
      await sendEmail({
        to: TARGET_EMAIL,
        subject: deliveredTpl.subject,
        html: deliveredTpl.html,
        text: deliveredTpl.text,
      })
      console.log('   ✅ Đã gửi thành công Email 4: Order Delivered (License Key)')
    }
  } catch (err) {
    console.error('   ❌ Lỗi gửi Email 4:', err)
  }

  // 5. Test Customer Support Reply (Phản hồi Hỗ trợ Khách hàng)
  try {
    console.log('\n5️⃣ Đang gửi Email 5: Phản hồi Hỗ trợ Khách hàng (Support Desk)...')
    const supportEmail = renderSupportReplyCorporateEmail({
      ticketId: 'SUP-9921',
      customerName: 'Kaito Kit',
      serviceName: 'Cursor Pro & Claude Code Agent',
      replyContent: 'Kỹ thuật viên Kandes.shop đã kiểm tra và hỗ trợ gia hạn thời gian sử dụng dịch vụ của bạn thành công. Nếu bạn cần cài đặt thêm trên VS Code hay macOS, bạn có thể tham gia nhóm Zalo để nhận script cài đặt tự động 1-dòng nhé!',
    })

    await sendEmail({
      to: TARGET_EMAIL,
      subject: supportEmail.subject,
      html: supportEmail.html,
      text: supportEmail.text,
    })
    console.log('   ✅ Đã gửi thành công Email 5: Customer Support Reply')
  } catch (err) {
    console.error('   ❌ Lỗi gửi Email 5:', err)
  }

  console.log(`\n===============================================================`)
  console.log(`🎉 HOÀN TẤT GỬI TOÀN BỘ 5 EMAIL TEST DOANH NGHIỆP!`)
  console.log(`===============================================================\n`)
}

runTests()
