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

import { renderOtpCorporateEmail, renderPasswordResetCorporateEmail } from './email-templates'

/** Test helper — reset provider (cho phép test swap mock). */
export function _resetEmailProvider() {
  _provider = null
}

/** Helper format — subject tiếng Việt cho OTP (chuẩn doanh nghiệp). */
export function otpEmail(code: string, purpose: 'login' | 'register' | 'verify' | 'reset' = 'login') {
  return renderOtpCorporateEmail(code, purpose)
}

/** Helper format — subject tiếng Việt cho password reset email (chuẩn doanh nghiệp). */
export function passwordResetEmail(resetUrl: string, expiresAt: Date) {
  return renderPasswordResetCorporateEmail(resetUrl, expiresAt)
}
