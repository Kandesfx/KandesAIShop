/**
 * Account: notification preferences — P5-07.
 *
 * Channel-level opt-in + per-event matrix. Default = true cho email, false
 * cho các channels còn lại (user phải opt-in tích cực).
 *
 * Schema stored trên `User.notificationPrefs JSON`:
 *   { channels: { email: bool, telegram: bool, zalo: bool, sms: bool }, events: { 'order.paid': bool, ... } }
 *
 * D40: Phase 5 wire cho customer opt-in. Admin alerts KHÔNG dùng pref này
 * (admin escalation qua `modules/sla/escalation.ts` đọc env recipient).
 */

export type NotificationChannel = 'email' | 'telegram' | 'zalo' | 'sms'

export const NOTIFICATION_EVENTS = [
  'order.created',
  'order.paid',
  'order.delivered',
  'order.cancelled',
  'order.refunded',
] as const

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]

export type NotificationPrefs = {
  channels: Record<NotificationChannel, boolean>
  events: Record<NotificationEvent, boolean>
}

export const DEFAULT_PREFS: NotificationPrefs = {
  channels: {
    email: true,
    telegram: false,
    zalo: false,
    sms: false,
  },
  events: {
    'order.created': true,
    'order.paid': true,
    'order.delivered': true,
    'order.cancelled': true,
    'order.refunded': true,
  },
}

export function mergePrefs(
  incoming: Partial<NotificationPrefs> | null | undefined
): NotificationPrefs {
  if (!incoming) return DEFAULT_PREFS
  return {
    channels: { ...DEFAULT_PREFS.channels, ...(incoming.channels ?? {}) },
    events: { ...DEFAULT_PREFS.events, ...(incoming.events ?? {}) },
  }
}
