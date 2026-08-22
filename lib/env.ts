import { z } from 'zod'

/**
 * Validate env lúc startup để fail-fast.
 * Production PHẢI có tất cả biến required.
 * Dev có thể dùng giá trị mặc định an toàn.
 */

const NODE_ENV = z.enum(['development', 'production', 'test']).default('development')

const envSchema = z.object({
  NODE_ENV,

  // Core
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Auth - 32 bytes hex (64 chars)
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET phải tối thiểu 32 ký tự')
    .default('dev-session-secret-do-not-use-in-production-please-replace-now'),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY phải là 32 bytes hex (64 ký tự)')
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

  // Email (Production default: resend)
  EMAIL_PROVIDER: z
    .enum(['console', 'resend', 'ses'])
    .default(process.env.NODE_ENV === 'production' || process.env.RESEND_API_KEY ? 'resend' : 'console'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Kandes Shop <no-reply@kandes.shop>'),

  // OAuth (Phase 2 - P1)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Payment (Phase 3)
  SEPAY_API_TOKEN: z.string().optional(),
  SEPAY_WEBHOOK_SECRET: z.string().optional(),

  // SePay VietQR (Phase 2 — P2-07 dùng để build QR URL trong checkout).
  // Khi chưa config, route /api/checkout sẽ trả 503 + hướng dẫn.
  // Docs: https://img.vietqr.io/doc
  SEPAY_BANK_CODE: z.string().optional(),
  SEPAY_ACCOUNT_NUMBER: z.string().optional(),
  SEPAY_ACCOUNT_NAME: z.string().optional(),
  SEPAY_QR_TEMPLATE: z.enum(['compact', 'compact2', 'qr_only']).default('compact2'),

  // Cloudflare Turnstile (Phase 9 — C7 anti-fraud cho /api/checkout).
  // Khi thiếu SECRET_KEY, route /api/checkout fallback về rate-limit hiện tại
  // (KHÔNG chặn checkout) — tránh regression nếu Turnstile down/misconfigured.
  // Docs: https://developers.cloudflare.com/turnstile/
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  // AI Gateway (Phase 6 — D51 path-prefix, base URL configurable)
  CCPRO_BASE_URL: z
    .string()
    .url()
    .optional()
    .default('https://api.ccpro.cn/v1'),

  // Notifications (Phase 5)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(), // P5-01 webhook verify
  ZALO_OA_ACCESS_TOKEN: z.string().optional(),
  ZALO_OA_SECRET: z.string().optional(), // P5-02 HMAC verify
  ZALO_OA_ADMIN_USER_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(), // SMS (P5-03)
  TWILIO_VOICE_FROM_NUMBER: z.string().optional(), // Voice (P5-04)
  PUBLIC_BASE_URL: z.string().url().optional(), // TwiML callback (P5-04) + webhook URLs (P5-07)
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().optional(), // P5-07 customer opt-in link
  NEXT_PUBLIC_ZALO_OA_URL: z.string().url().optional(), // P5-07 customer opt-in link

  // Cron — Bearer token cho Vercel Cron / external scheduler gọi /api/cron/*
  // 32+ ký tự, prod BẮT BUỘC set (dev fallback = 'dev-cron-secret-change-me').
  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET phải tối thiểu 32 ký tự')
    .default('dev-cron-secret-please-replace-32chars-min-XXX'),


  // Cache / Queue — optional khi dev. Validate URL chỉ khi có giá trị.
  UPSTASH_REDIS_REST_URL: z
    .string()
    .optional()
    .transform((v) => {
      if (!v || v.trim() === '') return undefined
      return v.trim()
    })
    .pipe(z.string().url('UPSTASH_REDIS_REST_URL không hợp lệ').optional()),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Monitoring
  SENTRY_DSN: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

const _parsed = envSchema.safeParse(process.env)

if (!_parsed.success) {
  // In ra lỗi rõ ràng và dừng app ngay
  console.error('❌ Invalid environment variables:')
  console.error(_parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables. Xem log ở trên.')
}

export const env = _parsed.data

/** Kiểm tra env đang chạy ở môi trường nào */
export const isDev = env.NODE_ENV === 'development'
export const isProd = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
