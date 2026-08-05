import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  DEFAULT_PREFS,
  mergePrefs,
  type NotificationPrefs,
} from './types'
import type { UpdatePrefsInput } from './validators'

/**
 * Notification preferences — customer — P5-07.
 *
 * Quy ước:
 *   - KHÔNG validate ở service (route đã parseInput).
 *   - Service nhận user đã auth (userId từ `getCurrentUser`).
 *   - Side-effect: N/A (immutable relative to other domains).
 */

export async function getPrefs(userId: string): Promise<NotificationPrefs> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  })

  const stored = row?.notificationPrefs as unknown as Partial<NotificationPrefs> | null
  return mergePrefs(stored)
}

/**
 * Update preferences. Pattern: shallow merge channels + events ở route; service
 * lưu trực tiếp vào `User.notificationPrefs` (JSON column).
 */
export async function updatePrefs(
  userId: string,
  input: UpdatePrefsInput
): Promise<NotificationPrefs> {
  const current = await getPrefs(userId)

  const next: NotificationPrefs = {
    channels: { ...current.channels, ...(input.channels ?? {}) },
    events: { ...current.events, ...(input.events ?? {}) },
  }

  await db.user.update({
    where: { id: userId },
    data: { notificationPrefs: next as never },
  })

  logger.info({ userId, channels: next.channels, events: next.events }, 'notification prefs updated')

  return next
}

/**
 * Opt-in Telegram by chat_id. Called khi user reply bot (P5-07 webhook).
 * Match user: nếu chat_id KHÔNG thuộc user nào → return null. Caller lưu
 * pending state; sau user confirm trên app thì bind.
 */
export async function findUserByTelegramChatId(chatId: string): Promise<{ id: string } | null> {
  const row = await db.user.findUnique({
    where: { telegramChatId: chatId },
    select: { id: true },
  })
  return row ? { id: row.id } : null
}

/**
 * Opt-in Zalo by user_id.
 */
export async function findUserByZaloUserId(zaloUserId: string): Promise<{ id: string } | null> {
  const row = await db.user.findUnique({
    where: { zaloUserId: zaloUserId },
    select: { id: true },
  })
  return row ? { id: row.id } : null
}

/**
 * Bind Telegram chat_id → user. Phase 5 caller là webhook `/start` handler,
 * match bằng cách user nhắn `/start <email>` → verify ownership.
 */
export async function bindTelegramChatId(
  userId: string,
  chatId: string
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { telegramChatId: chatId },
  })
  logger.info({ userId, chatId: chatId.slice(0, 4) + '****' }, 'telegram chat_id bound to user')
}

export async function bindZaloUserId(userId: string, zaloUserId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { zaloUserId },
  })
  logger.info({ userId, zaloUserId: zaloUserId.slice(0, 4) + '****' }, 'zalo user_id bound')
}

export const accountNotificationsService = {
  getPrefs,
  updatePrefs,
  findUserByTelegramChatId,
  findUserByZaloUserId,
  bindTelegramChatId,
  bindZaloUserId,
}

export { DEFAULT_PREFS }
