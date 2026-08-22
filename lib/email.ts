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
/**
 * AWS-hardened Resend provider:
 * - Timeout 30s (EC2 Security Group + VPC NAT Gateway có thể add latency).
 * - Retry 3 lần với exponential backoff: 1s → 2s → 4s.
 * - Retry khi gặp lỗi mạng (fetch throws) hoặc HTTP 5xx từ Resend.
 * - Log đủ context để debug trên CloudWatch Logs.
 */
const RESEND_MAX_RETRIES = 3
const RESEND_TIMEOUT_MS = 30_000

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async send(payload: EmailPayload): Promise<void> {
    const from = process.env.EMAIL_FROM ?? 'Kandes Shop <no-reply@kandes.shop>'
    const body = JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? payload.html.replace(/<[^>]*>/g, ''),
    })

    let lastError: unknown
    for (let attempt = 1; attempt <= RESEND_MAX_RETRIES; attempt++) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body,
          signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
        })

        if (resp.ok) {
          const resData = (await resp.json().catch(() => ({}))) as { id?: string }
          logger.info(
            { to: payload.to, subject: payload.subject, resendId: resData.id, attempt },
            'email: sent via Resend'
          )
          return
        }

        // 4xx = fatal (wrong API key, invalid address, domain not verified) → don't retry
        if (resp.status >= 400 && resp.status < 500) {
          const errBody = await resp.text().catch(() => '<no body>')
          throw new Error(
            `Resend API client error (${resp.status}): ${errBody.slice(0, 300)}`
          )
        }

        // 5xx = Resend server error → retry
        const errBody = await resp.text().catch(() => '<no body>')
        lastError = new Error(
          `Resend API server error (${resp.status}): ${errBody.slice(0, 200)}`
        )
        logger.warn(
          { to: payload.to, status: resp.status, attempt, maxRetries: RESEND_MAX_RETRIES },
          'Resend 5xx — will retry'
        )
      } catch (err) {
        // Network errors (ECONNRESET, ETIMEDOUT, AbortError from timeout) → retry
        lastError = err
        const isAbort = err instanceof Error && err.name === 'AbortError'
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(
          { to: payload.to, attempt, maxRetries: RESEND_MAX_RETRIES, error: msg, isAbort },
          'Resend network/timeout error — will retry'
        )

        // 4xx re-thrown above jumps here but is not retryable — check message
        if (msg.startsWith('Resend API client error')) throw err
      }

      if (attempt < RESEND_MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
        await sleep(backoffMs)
      }
    }

    // All retries exhausted
    logger.error(
      { to: payload.to, subject: payload.subject, maxRetries: RESEND_MAX_RETRIES, error: lastError },
      'Resend: all retries exhausted — email NOT sent'
    )
    throw lastError instanceof Error
      ? lastError
      : new Error(`Resend failed after ${RESEND_MAX_RETRIES} attempts`)
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

  const resendKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY

  if (env.EMAIL_PROVIDER === 'resend') {
    if (!resendKey) {
      throw new Error(
        'EMAIL_PROVIDER=resend nhưng chưa cấu hình RESEND_API_KEY trong biến môi trường.'
      )
    }
    _provider = new ResendEmailProvider(resendKey)
    return _provider
  }

  if (resendKey && env.EMAIL_PROVIDER !== 'console') {
    _provider = new ResendEmailProvider(resendKey)
    return _provider
  }

  if (env.EMAIL_PROVIDER === 'ses') {
    _provider = new SesStubProvider()
    return _provider
  }

  _provider = new ConsoleEmailProvider()
  return _provider
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  return getEmailProvider().send(payload)
}

import {
  renderOtpCorporateEmail,
  renderPasswordResetCorporateEmail,
  renderWelcomeCorporateEmail,
  renderContactReceiptCorporateEmail,
  renderAdminNewContactAlertCorporateEmail,
} from './email-templates'

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

/** Helper format — email chào mừng thành viên mới. */
export function welcomeEmail(data: { customerName?: string; email: string }) {
  return renderWelcomeCorporateEmail(data)
}

/** Helper format — email biên nhận yêu cầu hỗ trợ gửi cho khách hàng. */
export function contactReceiptEmail(data: {
  customerName: string
  subject: string
  message: string
  ticketId?: string
}) {
  return renderContactReceiptCorporateEmail(data)
}

/** Helper format — email cảnh báo cho Admin khi có khách gửi thư hỗ trợ mới. */
export function adminNewContactAlertEmail(data: {
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  subject: string
  message: string
  submissionId: string
}) {
  return renderAdminNewContactAlertCorporateEmail(data)
}
