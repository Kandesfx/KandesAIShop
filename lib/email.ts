import { env } from './env'
import { logger } from './logger'

/**
 * Email provider — Phase 2.
 *
 * Hỗ trợ:
 *   - console: log ra stdout (dev/test)
 *   - resend:  Phase 3+ dùng Resend API
 *   - ses:      Phase 3+ dùng AWS SES
 *
 * Interface chung để Phase 2 code không phụ thuộc provider cụ thể.
 * Mọi OTP/transactional email đều đi qua sendEmail().
 */

export type EmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>
}

class ConsoleEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    logger.info(
      {
        provider: 'console',
        to: payload.to,
        subject: payload.subject,
        text: payload.text ?? payload.html.replace(/<[^>]*>/g, ''),
      },
      'EMAIL (console)'
    )
  }
}

/**
 * Stub cho Resend/SES — chưa implement trong Phase 2.
 * Throw error nếu cố dùng để nhắc nhở cần config đúng.
 */
class StubProvider implements EmailProvider {
  constructor(private name: string) {}
  async send(payload: EmailPayload): Promise<void> {
    throw new Error(
      `Email provider '${this.name}' chưa được cài đặt trong Phase 2. Set EMAIL_PROVIDER=console để dev.`
    )
  }
}

let _provider: EmailProvider | null = null

export function getEmailProvider(): EmailProvider {
  if (_provider) return _provider
  switch (env.EMAIL_PROVIDER) {
    case 'console':
      _provider = new ConsoleEmailProvider()
      break
    case 'resend':
      _provider = new StubProvider('resend')
      break
    case 'ses':
      _provider = new StubProvider('ses')
      break
  }
  return _provider!
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  return getEmailProvider().send(payload)
}

/** Test helper — reset provider (cho phép test swap mock). */
export function _resetEmailProvider() {
  _provider = null
}

/** Helper format — subject tiếng Việt cho OTP. */
export function otpEmail(code: string, purpose: 'login' | 'register' | 'verify' | 'reset' = 'login') {
  const labels = {
    login: 'đăng nhập',
    register: 'xác nhận đăng ký',
    verify: 'xác nhận tài khoản',
    reset: 'đặt lại mật khẩu',
  }
  return {
    subject: `[Kandes.shop] Mã xác thực ${labels[purpose]} của bạn`,
    text: `Mã xác thực (OTP) của bạn là: ${code}\nMã có hiệu lực trong 10 phút.\nNếu bạn không yêu cầu mã này, vui lòng bỏ qua email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111; margin-bottom: 16px;">Mã xác thực của bạn</h2>
        <p style="color: #444; line-height: 1.5;">Dùng mã bên dưới để ${labels[purpose]}:</p>
        <div style="background: #f5f5f5; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 28px; letter-spacing: 6px; color: #111;">${code}</span>
        </div>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">
          Mã có hiệu lực trong <strong>10 phút</strong>.<br>
          Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
        </p>
      </div>
    `,
  }
}
