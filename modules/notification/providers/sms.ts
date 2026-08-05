import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { NotificationProvider } from '../types'

/**
 * SMS provider (Twilio) — P5-03.
 *
 * Gửi SMS qua Twilio REST API. Pattern mirror telegram/zalo: wrap
 * `NotificationProvider.send()` để `notificationService.processQueue`
 * route đúng channel.
 *
 * Config (env):
 *   - TWILIO_ACCOUNT_SID — Project SID
 *   - TWILIO_AUTH_TOKEN — Auth token (sensitive — mask khi log)
 *   - TWILIO_FROM_NUMBER — SĐT gửi (vd "+15005550006")
 *
 * Behavioral notes:
 *   - Phone format E.164 bắt buộc (`+84xxxxxxxxx`). Validate trước khi gửi.
 *   - Mask phone trong log (giữ 4 số cuối).
 *   - Timeout 5s.
 *   - Twilio trả `{ sid, status, ...}` khi OK; throw `error_code + error_message`
 *     khi fail để retry queue xử lý.
 *
 * Subject + html không dùng cho SMS — fold vào body "{subject}\n{text}".
 */

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01'

export const E164_REGEX = /^\+[1-9]\d{1,14}$/

export interface SmsSendInput {
  to: string
  subject?: string
  text: string
}

class SmsNotificationProvider implements NotificationProvider {
  channel = 'sms' as const

  async send(args: { to: string; subject: string; html: string; text: string }): Promise<void> {
    await sendSmsMessage({
      to: args.to,
      subject: args.subject,
      text: args.text,
    })
  }
}

let _provider: NotificationProvider | null = null

export function getSmsProvider(): NotificationProvider {
  if (_provider) return _provider
  _provider = new SmsNotificationProvider()
  return _provider
}

/** Test helper — swap provider. */
export function _setSmsProvider(provider: NotificationProvider | null): void {
  _provider = provider
}

/**
 * Send SMS via Twilio.
 */
export async function sendSmsMessage(input: SmsSendInput): Promise<void> {
  const accountSid = env.TWILIO_ACCOUNT_SID
  const authToken = env.TWILIO_AUTH_TOKEN
  const fromNumber = env.TWILIO_FROM_NUMBER
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio config chưa đầy đủ (SID/Auth/From)')
  }

  if (!E164_REGEX.test(input.to)) {
    throw new Error(`Phone không hợp lệ E.164: ${maskPhone(input.to)}`)
  }

  const composed = input.subject ? `${input.subject}\n${input.text}` : input.text
  const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`

  const body = new URLSearchParams({
    To: input.to,
    From: fromNumber,
    Body: composed,
  })

  const basic = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  let resp: Response
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, to: maskPhone(input.to) },
      'twilio sms: network error'
    )
    throw new Error(`Twilio network error: ${(err as Error).message}`)
  }

  if (!resp.ok) {
    let detail = ''
    try {
      const json = (await resp.json()) as {
        code?: number
        message?: string
        error_code?: number
      }
      detail = `code=${json.code ?? json.error_code ?? '?'}: ${json.message ?? ''}`
    } catch {
      // ignore
    }
    logger.warn(
      { status: resp.status, to: maskPhone(input.to), detail },
      'twilio sms: API non-2xx'
    )
    throw new Error(`Twilio SMS API ${resp.status}: ${detail || 'unknown error'}`)
  }
}

/** Mask phone trong log — giữ 4 số cuối. */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****'
  return `****${phone.slice(-4)}`
}
