import pino from 'pino'
import { env, isDev } from './env'

/**
 * Structured logger dùng pino.
 * ĐÃ redact các field nhạy cảm theo MASTER_SPEC §4.7.
 *
 * Không bao giờ log: password, token, key value, JWT, OTP, sĐT khách.
 *
 * Lưu ý Next.js: pino-pretty dùng worker thread (thread-stream) không tương thích
 * với Next.js dev runtime (Module not found lib/worker.js). Để dev dùng JSON thuần,
 * pretty chỉ dùng khi chạy qua CLI (tsx/seed).
 */
const REDACT_PATHS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  '*.value', // inventory value (encrypted)
  '*.deliveredContent',
  '*.deliveredContentEncrypted',
  '*.otp',
  '*.code',
  'req.headers.authorization',
  'req.headers.cookie',
  'authorization',
  // Phase 7-RB (D53, D59): mask upstream brand để KHÔNG lộ NCC provider trong log output.
  'apiKeyEncrypted',
  'upstreamApiKey',
  'upstreamBaseUrl',
  'nccApiKey',
  'nccKeyId',
  'pinnedNccKeyId',
]

const REDACT_PATTERNS: Array<[RegExp, string]> = [
  // Mask NCC upstream URL trong log messages.
  [/https?:\/\/api\.ccpro\.cn[^\s"']*/g, 'https://***'],
  // Mask NCC plaintext key prefix (sk-jy-...).
  [/sk-jy-[a-z0-9-]{4,}/g, 'sk-jy-***'],
]

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  // Phase 7-RB (D59): strip NCC upstream URL + key prefix khỏi log messages.
  formatters: {
    log(object) {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(object)) {
        if (typeof v === 'string') {
          let masked = v
          for (const [pattern, replacement] of REDACT_PATTERNS) {
            masked = masked.replace(pattern, replacement)
          }
          out[k] = masked
        } else {
          out[k] = v
        }
      }
      return out
    },
  },
  base: {
    service: 'kandes-web',
    env: env.NODE_ENV,
  },
})

/** Helper log kèm context cho service. */
export function loggerWithContext(context: Record<string, unknown>) {
  return logger.child(context)
}

/** Helper log error. */
export function logError(err: unknown, msg = 'Unhandled error', context?: Record<string, unknown>) {
  if (err instanceof Error) {
    logger.error({ err, ...context }, msg)
  } else {
    logger.error({ err: String(err), ...context }, msg)
  }
}
