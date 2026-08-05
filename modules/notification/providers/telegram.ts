import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { NotificationProvider } from '../types'

/**
 * Telegram provider — P5-01.
 *
 * Gọi Telegram Bot API HTTP endpoint `sendMessage`. Phase 5 wrap theo giao
 * thức của `NotificationProvider` để `processQueue` route đúng channel.
 *
 * Config:
 *   - TELEGRAM_BOT_TOKEN (env)
 *   - TELEGRAM_ADMIN_CHAT_ID (env) — recipient mặc định cho admin alerts
 *
 * Behavioral notes:
 *   - Không log raw `bot token` (nó là credential).
 *   - Mask `chat_id` (8 chars) khi log.
 *   - Timeout 5s qua AbortSignal — Vercel function max 10s.
 *   - Telegram API returns `description` field khi error → throw để retry.
 *
 * Subject được map vào "first line" của text (Telegram заголовок nhỏ) — các
 * receivers sẽ thấy "{subject}\n{text}" thay vì tách riêng.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org'

export interface TelegramSendInput {
  chatId: string
  subject?: string
  text: string
}

class TelegramNotificationProvider implements NotificationProvider {
  channel = 'telegram' as const

  async send(args: { to: string; subject: string; html: string; text: string }): Promise<void> {
    await sendTelegramMessage({
      chatId: args.to,
      subject: args.subject,
      text: args.text,
    })
  }
}

let _provider: NotificationProvider | null = null

export function getTelegramProvider(): NotificationProvider {
  if (_provider) return _provider
  _provider = new TelegramNotificationProvider()
  return _provider
}

/** Test helper — swap provider. */
export function _setTelegramProvider(provider: NotificationProvider | null): void {
  _provider = provider
}

/**
 * Send a single message to a specific chat. Public export for tests, admin
 * UI "Test gửi Telegram" button, và SLA scanner.
 */
export async function sendTelegramMessage(input: TelegramSendInput): Promise<void> {
  const botToken = env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN chưa config')
  }

  const composed = input.subject
    ? `*${input.subject}*\n\n${input.text}`
    : input.text

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`
  const body = {
    chat_id: input.chatId,
    text: composed,
    parse_mode: 'Markdown' as const,
    disable_web_page_preview: true,
  }

  let resp: Response
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, chatId: maskChatId(input.chatId) },
      'telegram: network error'
    )
    throw new Error(`Telegram network error: ${(err as Error).message}`)
  }

  if (!resp.ok) {
    let detail = ''
    try {
      const json = (await resp.json()) as { description?: string }
      detail = json.description ?? ''
    } catch {
      // ignore — best-effort
    }
    logger.warn(
      { status: resp.status, chatId: maskChatId(input.chatId), detail },
      'telegram: API non-2xx'
    )
    throw new Error(`Telegram API ${resp.status}: ${detail || 'unknown error'}`)
  }
}

/**
 * getMe — dùng "setup wizard" trong admin verify token hợp lệ và lấy bot info.
 */
export async function getTelegramBotInfo(): Promise<{
  id: number
  username: string
  firstName: string
  isBot: boolean
}> {
  const botToken = env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN chưa config')
  }
  const url = `${TELEGRAM_API_BASE}/bot${botToken}/getMe`
  const resp = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  })
  if (!resp.ok) {
    throw new Error(`Telegram getMe ${resp.status}`)
  }
  const json = (await resp.json()) as {
    ok: boolean
    result?: { id: number; username: string; first_name: string; is_bot: boolean }
    description?: string
  }
  if (!json.ok || !json.result) {
    throw new Error(`Telegram getMe: ${json.description ?? 'invalid response'}`)
  }
  return {
    id: json.result.id,
    username: json.result.username,
    firstName: json.result.first_name,
    isBot: json.result.is_bot,
  }
}

function maskChatId(chatId: string): string {
  if (chatId.length <= 4) return '****'
  return `${chatId.slice(0, 2)}****${chatId.slice(-2)}`
}
