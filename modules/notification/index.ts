export {
  notificationService,
  notify,
  processQueue,
  notifyOrderEvent,
  getNotification,
} from './service'
export { notificationAdmin } from './admin'
export { getEmailProvider, _setEmailProvider } from './providers/email'
export { getTelegramProvider, _setTelegramProvider } from './providers/telegram'
export { getZaloProvider, _setZaloProvider } from './providers/zalo'
export { getSmsProvider, _setSmsProvider } from './providers/sms'
export { getVoiceProvider, _setVoiceProvider } from './providers/voice'
export { resolveTemplate } from './templates'
export { resolveTemplateUniversal } from './templates-db'
export { peekDueRows, markSent, recordFailure, enqueueRetry } from './queue'
export { DEFAULT_BACKOFF_MINUTES, DEFAULT_MAX_ATTEMPTS } from './types'
export type {
  NotificationEvent,
  Recipient,
  NotificationData,
  EnqueueInput,
  EnqueueResult,
  ProcessResult,
  NotificationProvider,
  ResolvedTemplate,
} from './types'
export type { QueueRow } from './queue'
