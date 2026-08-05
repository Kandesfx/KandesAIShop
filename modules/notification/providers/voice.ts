import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { maskPhone } from './sms'
import type { NotificationProvider } from '../types'

/**
 * Voice provider (Twilio) — P5-04.
 *
 * Twilio voice call: POST Calls.json với `Url` callback. Twilio sẽ fetch
 * TwiML XML từ callback để biết đọc gì + gather DTMF.
 *
 * Pattern mirror SMS/Telegram/Zalo: wrap `NotificationProvider.send()`.
 *
 * Config (env):
 *   - TWILIO_ACCOUNT_SID
 *   - TWILIO_AUTH_TOKEN
 *   - TWILIO_VOICE_FROM_NUMBER (SĐT nguồn)
 *   - PUBLIC_BASE_URL — base URL cho callback (vd https://kandes.shop)
 *
 * Flow:
 *   1. Caller (SLA scanner) gọi `send()` → POST Calls.json
 *   2. Twilio → GET callback URL → trả TwiML say/ gather
 *   3. Twilio → POST callback URL với `Digits` → trả TwiML finalize + Hangup
 *
 * Subject + text fold vào message: "Subject: {subject}\n{text}".
 * Vi-VN dùng Google voice `<Say voice="vi-VN">` (Polly Vietnamese cần explicit
 * voice id; Google default vi-VN OK cho Twilio free tier).
 */

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01'
const CALLBACK_PATH = '/api/voice/respond'

export interface VoiceSendInput {
  to: string
  subject?: string
  text: string
}

class VoiceNotificationProvider implements NotificationProvider {
  channel = 'voice' as const

  async send(args: { to: string; subject: string; html: string; text: string }): Promise<void> {
    await sendVoiceCall({
      to: args.to,
      subject: args.subject,
      text: args.text,
    })
  }
}

let _provider: NotificationProvider | null = null

export function getVoiceProvider(): NotificationProvider {
  if (_provider) return _provider
  _provider = new VoiceNotificationProvider()
  return _provider
}

/** Test helper — swap provider. */
export function _setVoiceProvider(provider: NotificationProvider | null): void {
  _provider = provider
}

/**
 * Start a voice call. Twilio sẽ fetch callback URL để lấy TwiML.
 */
export async function sendVoiceCall(input: VoiceSendInput): Promise<void> {
  const sid = env.TWILIO_ACCOUNT_SID
  const auth = env.TWILIO_AUTH_TOKEN
  const fromNumber = env.TWILIO_VOICE_FROM_NUMBER
  const baseUrl = env.PUBLIC_BASE_URL

  if (!sid || !auth || !fromNumber) {
    throw new Error('Twilio voice config chưa đầy đủ (SID/Auth/From)')
  }
  if (!baseUrl) {
    throw new Error('PUBLIC_BASE_URL chưa config (cần cho TwiML callback)')
  }

  // Encode message + subject vào URL — Twilio fetch kèm query string. Subject +
  // text limit phải nhỏ để URL không bị quá dài (giới hạn ~8192 chars Twilio).
  const message = input.subject
    ? `${input.subject}: ${input.text}`.slice(0, 500)
    : input.text.slice(0, 500)
  const callbackUrl = `${baseUrl}${CALLBACK_PATH}?msg=${encodeURIComponent(message)}`

  const body = new URLSearchParams({
    To: input.to,
    From: fromNumber,
    Url: callbackUrl,
  })

  const basic = Buffer.from(`${sid}:${auth}`).toString('base64')

  const url = `${TWILIO_API_BASE}/Accounts/${sid}/Calls.json`

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
      'twilio voice: network error'
    )
    throw new Error(`Twilio voice network error: ${(err as Error).message}`)
  }

  if (!resp.ok) {
    let detail = ''
    try {
      const json = (await resp.json()) as { message?: string; code?: number }
      detail = `code=${json.code ?? '?'}: ${json.message ?? ''}`
    } catch {
      // ignore
    }
    logger.warn(
      { status: resp.status, to: maskPhone(input.to), detail },
      'twilio voice: API non-2xx'
    )
    throw new Error(`Twilio Voice API ${resp.status}: ${detail || 'unknown error'}`)
  }
}
