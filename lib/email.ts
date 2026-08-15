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
 * Resend provider — D74 implementation.
 * Sử dụng Resend REST API (https://resend.com/docs/api-reference/emails/send-email).
 * Required env: `RESEND_API_KEY`. Optional: `EMAIL_FROM` (env config tự default nếu thiếu).
 */
class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async send(payload: EmailPayload): Promise<void> {
    const from = process.env.EMAIL_FROM ?? 'Kandes Shop <no-reply@kandes.shop>'
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? payload.html.replace(/<[^>]*>/g, ''),
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '<no body>')
      throw new Error(
        `Resend API error: ${resp.status} ${resp.statusText} — ${errBody.slice(0, 200)}`
      )
    }

    logger.info({ to: payload.to, subject: payload.subject }, 'email: sent via Resend')
  }
}

/**
 * SES provider — D74 placeholder. Implement AWS SDK call ở phase sau
 * (cần IAM creds cho botocator + SNS bounce/complaint handling). Hiện tại
 * throw loud để admin biết cần implement trước khi set EMAIL_PROVIDER=ses.
 */
class SesStubProvider implements EmailProvider {
  async send(_payload: EmailPayload): Promise<void> {
    throw new Error(
      "Email provider 'ses' chưa được cài đặt trong D74. " +
        'Dùng Resend (set EMAIL_PROVIDER=resend + RESEND_API_KEY). ' +
        'Hoặc implement tại lib/email.ts (TODO @ D74 follow-up).'
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
      // D74: fail-fast nếu thiếu RESEND_API_KEY (tránh fallback silent về console).
      if (!env.RESEND_API_KEY) {
        throw new Error(
          "EMAIL_PROVIDER=resend nhưng RESEND_API_KEY chưa config. Set key hoặc đổi về EMAIL_PROVIDER=console."
        )
      }
      _provider = new ResendEmailProvider(env.RESEND_API_KEY)
      break
    case 'ses':
      _provider = new SesStubProvider()
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

/** Helper format — subject tiếng Việt cho password reset email. */
export function passwordResetEmail(resetUrl: string, expiresAt: Date) {
  const minutes = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000))
  return {
    subject: '[Kandes.shop] Đặt lại mật khẩu của bạn',
    text:
      `Chào bạn,\n\n` +
      `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\n` +
      `Vui lòng truy cập link sau để đặt lại mật khẩu (có hiệu lực ${minutes} phút):\n${resetUrl}\n\n` +
      `Nếu bạn không yêu cầu, vui lòng bỏ qua email — tài khoản của bạn vẫn an toàn.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111; margin-bottom: 16px;">Đặt lại mật khẩu</h2>
        <p style="color: #444; line-height: 1.5;">
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
        </p>
        <p style="margin: 24px 0; text-align: center;">
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 4px;">
            Đặt lại mật khẩu
          </a>
        </p>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">
          Link có hiệu lực trong <strong>${minutes} phút</strong>.<br>
          Nếu nút không hoạt động, sao chép link sau: <br>
          <code style="word-break: break-all; color: #444;">${resetUrl}</code>
        </p>
        <p style="color: #888; font-size: 12px; line-height: 1.5; margin-top: 24px;">
          Nếu bạn không yêu cầu, vui lòng bỏ qua email — tài khoản của bạn vẫn an toàn.
        </p>
      </div>
    `,
  }
}
