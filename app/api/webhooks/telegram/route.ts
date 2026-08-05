import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/telegram
 * Telegram gửi update (message, callback_query, edited_message...) khi user
 * tương tác với bot. Phase 5 P5-07: handle message text để opt-in Telegram.
 *
 * Quy ước opt-in:
 *   - User nhắn `/start <email>` cho bot → tìm User theo email → bind telegramChatId.
 *   - User nhắn `/start` đơn giản → reply hướng dẫn (no bind).
 *
 * Auth:
 *   - X-Telegram-Bot-Api-Secret-Token header (khi webhook secret set).
 */
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-telegram-bot-api-secret-token')
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET

    if (expected && secret !== expected) {
      logger.warn('telegram webhook: invalid secret token')
      return fail({ code: 'FORBIDDEN', message: 'Invalid secret' }, req)
    }

    const update = await req.json().catch(() => null)
    if (!update || typeof update !== 'object') {
      return fail({ code: 'VALIDATION_ERROR', message: 'Invalid update payload' }, req)
    }

    const updateId = (update as { update_id?: number }).update_id
    const message = (update as { message?: { text?: string; chat?: { id?: number }; from?: { id?: number } } }).message

    if (message?.text) {
      const text = message.text.trim()
      const chatId = message.chat?.id

      if (text === '/start') {
        logger.info({ chatId }, 'telegram webhook: /start received — guidance reply')
      } else if (text.startsWith('/start ') && chatId) {
        const email = text.slice(7).trim().toLowerCase()
        if (email.includes('@')) {
          const user = await db.user.findUnique({
            where: { email },
            select: { id: true },
          })
          if (user) {
            await db.user.update({
              where: { id: user.id },
              data: { telegramChatId: String(chatId) },
            })
            logger.info(
              { chatId: maskChatId(String(chatId)), email: maskEmailLocal(email) },
              'telegram webhook: chat_id bound to user'
            )
          } else {
            logger.info({ chatId }, 'telegram webhook: no user matched email')
          }
        }
      }
    }

    logger.info({ updateId, hasMessage: Boolean(message) }, 'telegram webhook: update received')
    return ok({ received: true })
  } catch (err) {
    return fail(err, req)
  }
}

function maskChatId(chatId: string): string {
  if (chatId.length <= 4) return '****'
  return `${chatId.slice(0, 2)}****${chatId.slice(-2)}`
}

function maskEmailLocal(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  return `${local.slice(0, 2)}***@${domain}`
}
