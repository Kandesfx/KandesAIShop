import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { getAliasByEmail, EMAIL_ALIASES } from './aliases'
import {
  getAllThreads,
  getThreadById,
  saveOutboundMessage,
  saveInboundMessage,
  updateStatus,
} from './store'
import type { EmailThread, EmailMessage, ThreadStatus, SendMailInput, InboundMailInput } from './types'

/**
 * Send an outbound email via selected domain alias using Resend API
 */
export async function sendMailViaAlias(input: SendMailInput & { authorName?: string }): Promise<{
  success: boolean
  messageId?: string
  message: EmailMessage
}> {
  const aliasObj = getAliasByEmail(input.aliasEmail)
  const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY
  const authorName = input.authorName || 'Kandes Administrator'

  const formattedSubject = input.subject.trim()
  const plainText = input.bodyHtml.replace(/<[^>]*>/g, '')

  // Professional HTML body wrapped in Kandes styling
  const styledHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #05070A; color: #F1F5F9; line-height: 1.6;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #05070A; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #090D16; border: 1px solid #1E293B; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 20px 24px; border-bottom: 1px solid #1E293B; background: linear-gradient(90deg, #090D16 0%, #0F172A 100%);">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-family: monospace; font-size: 16px; font-weight: 800; color: #00F0FF; letter-spacing: 0.1em; text-transform: uppercase;">
                      ⚡ KANDES.SHOP
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-family: monospace; color: #94A3B8; background: #131824; padding: 4px 8px; border-radius: 4px; border: 1px solid #1E293B;">
                      ${aliasObj.email}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Content -->
          <tr>
            <td style="padding: 28px 24px; color: #E2E8F0; font-size: 14px; line-height: 1.7;">
              ${input.bodyHtml.includes('<p>') ? input.bodyHtml : `<p>${input.bodyHtml.replace(/\n/g, '<br/>')}</p>`}
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding: 16px 24px; background-color: #06080C; border-top: 1px solid #131824; font-size: 12px; color: #94A3B8; line-height: 1.6;">
              <strong style="color: #00F0FF;">${aliasObj.name}</strong><br/>
              Website: <a href="https://kandes.shop" style="color: #38BDF8; text-decoration: none;">https://kandes.shop</a> · Zalo Hỗ trợ: <strong style="color: #F8FAFC;">0865.834.117</strong><br/>
              <span style="font-size: 11px; color: #64748B;">Hệ thống phân phối bản quyền AI Coding & Công cụ lập trình chính hãng 30s</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  let resendMessageId: string | undefined

  if (apiKey) {
    try {
      const fromHeader = `${aliasObj.name} <${aliasObj.email}>`
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [input.toEmail],
          reply_to: aliasObj.email,
          subject: formattedSubject,
          html: styledHtml,
          text: plainText,
        }),
        signal: AbortSignal.timeout(15_000),
      })

      if (resp.ok) {
        const resData = (await resp.json().catch(() => ({}))) as { id?: string }
        resendMessageId = resData.id
        logger.info(
          { to: input.toEmail, from: aliasObj.email, resendId: resendMessageId },
          'Email sent successfully via alias'
        )
      } else {
        const errText = await resp.text().catch(() => '<no body>')
        logger.warn(
          { status: resp.status, error: errText, to: input.toEmail, from: aliasObj.email },
          'Failed to send via Resend API'
        )
      }
    } catch (err) {
      logger.error({ err, to: input.toEmail, from: aliasObj.email }, 'Resend API network error')
    }
  } else {
    logger.info(
      { to: input.toEmail, from: aliasObj.email, subject: formattedSubject },
      'EMAIL (local console mode — no RESEND_API_KEY)'
    )
  }

  // Save to persistent message store
  const savedMessage = saveOutboundMessage({
    threadId: input.threadId || `thr-${Date.now()}`,
    aliasEmail: aliasObj.email,
    aliasName: aliasObj.name,
    toEmail: input.toEmail,
    subject: formattedSubject,
    bodyHtml: styledHtml,
    bodyText: plainText,
    authorName,
  })

  return {
    success: true,
    messageId: resendMessageId,
    message: savedMessage,
  }
}

/**
 * Handle incoming email webhook from customer
 */
export function handleInboundEmail(input: InboundMailInput): {
  thread: EmailThread
  message: EmailMessage
} {
  return saveInboundMessage({
    fromEmail: input.fromEmail,
    fromName: input.fromName,
    toEmail: input.toEmail,
    subject: input.subject || 'Không có tiêu đề',
    bodyHtml: input.bodyHtml,
    bodyText: input.bodyText,
  })
}

export async function getMailThreads(filter?: {
  alias?: string
  status?: ThreadStatus | 'all'
  search?: string
}): Promise<EmailThread[]> {
  return getAllThreads(filter)
}

export async function getMailThreadDetails(threadId: string): Promise<{
  thread: EmailThread
  messages: EmailMessage[]
} | null> {
  return getThreadById(threadId)
}

export function setThreadStatus(threadId: string, status: ThreadStatus): boolean {
  return updateStatus(threadId, status)
}
