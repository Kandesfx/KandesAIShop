import crypto from 'crypto'
import { timingSafeEqual } from 'crypto'
import { env } from './env'
import { AppError } from './errors'

/**
 * Webhook signature verification — HMAC SHA-256.
 *
 * Phase 3: dùng cho SePay webhook.
 * Phase 4+: có thể dùng cho Twilio, Telegram nếu họ cùng chuẩn HMAC.
 *
 * Pattern:
 *   - Provider ký payload bằng secret, gửi signature qua header (vd `x-sepay-signature`).
 *   - Server tính lại HMAC của raw body bằng cùng secret.
 *   - So sánh qua `timingSafeEqual` (constant-time) — tránh timing attack.
 *
 * ⚠️ Bắt buộc nhận RAW STRING (không parsed JSON) vì parse rồi serialize lại có thể
 * khác về whitespace/key-order, dẫn đến signature mismatch.
 */
export type VerifyOptions = {
  /** Raw body string từ request. */
  rawBody: string
  /** Signature từ header (đã strip prefix nếu có). */
  signature: string | null | undefined
  /** Secret dùng để verify. */
  secret: string
  /** Algorithm (mặc định sha256). */
  algorithm?: 'sha256' | 'sha512'
  /** Encoding của signature input (hex | base64). Mặc định hex. */
  signatureEncoding?: 'hex' | 'base64'
}

/**
 * Verify HMAC signature.
 * Throw `AppError('WEBHOOK_INVALID_SIGNATURE')` nếu fail.
 */
export function verifyHmacSignature(opts: VerifyOptions): void {
  const { rawBody, signature, secret, algorithm = 'sha256', signatureEncoding = 'hex' } = opts

  if (!signature) {
    throw new AppError('WEBHOOK_MISSING_SIGNATURE', 'Thiếu signature header', 401)
  }

  const expected = crypto.createHmac(algorithm, secret).update(rawBody).digest(signatureEncoding)

  // So sánh string constant-time (không timing attack). Nếu length khác → fail.
  if (expected.length !== signature.length) {
    throw new AppError('WEBHOOK_INVALID_SIGNATURE', 'Chữ ký không hợp lệ', 401)
  }

  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new AppError('WEBHOOK_INVALID_SIGNATURE', 'Chữ ký không hợp lệ', 401)
  }
}

/**
 * Extract signature từ header — hỗ trợ cả format thuần và prefix (vd "sha256=abcdef...").
 * Trả về chuỗi signature chưa có prefix, hoặc null nếu không có.
 */
export function extractSignature(header: string | null | undefined): string | null {
  if (!header) return null
  const parts = header.split('=', 2)
  if (parts.length === 2 && parts[1]) return parts[1].trim()
  return header.trim()
}

/**
 * Đọc raw body từ NextRequest (trước khi parse JSON).
 * Caller PHẢI truyền raw body vào verifyHmacSignature.
 */
export async function readRawBody(req: Request): Promise<string> {
  return await req.text()
}

/**
 * Helper: kiểm tra xem webhook provider có config secret không.
 */
export function isWebhookConfigured(secret: string | undefined): boolean {
  return Boolean(secret && secret.length >= 16)
}

/**
 * Re-export env.SEPAY_WEBHOOK_SECRET để gọn.
 */
export function getSepayWebhookSecret(): string | undefined {
  return env.SEPAY_WEBHOOK_SECRET
}

/**
 * Signature cho SePay webhook — header `X-Sepay-Signature` chứa hex SHA-256.
 */
export const SEPAY_SIGNATURE_HEADER = 'x-sepay-signature'
export const SEPAY_SIGNATURE_ALGORITHM = 'sha256' as const
export const SEPAY_SIGNATURE_ENCODING = 'hex' as const
