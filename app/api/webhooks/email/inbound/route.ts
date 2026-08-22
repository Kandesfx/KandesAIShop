import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { logger } from '@/lib/logger'
import { handleInboundEmail } from '@/modules/mail/service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/email/inbound — Webhook tiếp nhận thư khách hàng gửi đến các Alias
 * Hỗ trợ Resend Inbound Webhook / SendGrid Inbound Parse / Mailgun / AWS SES
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let fromEmail = ''
    let fromName = ''
    let toEmail = ''
    let subject = ''
    let bodyHtml = ''
    let bodyText = ''

    if (contentType.includes('application/json')) {
      const json = await req.json()
      // Resend or generic JSON webhook format
      fromEmail = json.from?.email || json.from || json.sender || ''
      fromName = json.from?.name || json.from_name || ''
      toEmail = Array.isArray(json.to) ? json.to[0] : (json.to?.email || json.to || json.recipient || 'support@kandes.shop')
      subject = json.subject || 'Thư gửi đến Kandes.shop'
      bodyHtml = json.html || json.body_html || ''
      bodyText = json.text || json.body_text || json.text_body || ''
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      fromEmail = (formData.get('from') as string) || (formData.get('sender') as string) || ''
      toEmail = (formData.get('to') as string) || (formData.get('recipient') as string) || 'support@kandes.shop'
      subject = (formData.get('subject') as string) || 'Thư gửi đến Kandes.shop'
      bodyHtml = (formData.get('html') as string) || (formData.get('body-html') as string) || ''
      bodyText = (formData.get('text') as string) || (formData.get('body-plain') as string) || ''
    }

    if (!fromEmail || !fromEmail.includes('@')) {
      return fail(new Error('Thiếu thông tin người gửi fromEmail'), req)
    }

    logger.info({ fromEmail, toEmail, subject }, 'Inbound email received')

    const result = handleInboundEmail({
      fromEmail,
      fromName,
      toEmail,
      subject,
      bodyHtml,
      bodyText,
    })

    return ok({
      success: true,
      threadId: result.thread.id,
      messageId: result.message.id,
    })
  } catch (err) {
    logger.error({ err }, 'Error processing inbound email webhook')
    return fail(err, req)
  }
}
