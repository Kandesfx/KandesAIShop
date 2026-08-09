import { env } from '../../lib/env'
import { logger } from '../../lib/logger'

/**
 * Cloudflare Turnstile verification — Phase 9 C7 (anti-fraud cho checkout).
 *
 * Flow:
 *   - Client render widget `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (components/checkout/turnstile-widget.tsx).
 *   - Client submit form kèm `cf-turnstile-response` token.
 *   - Server (`POST /api/checkout`) gọi `verifyTurnstileToken()` TRƯỚC khi tạo order.
 *
 * Fallback (theo PHASE_9_POLISH.md §Đợt 2):
 *   - Nếu `TURNSTILE_SECRET_KEY` chưa config → `isTurnstileConfigured()` false →
 *     route SKIP verify, chỉ dựa vào rate-limit hiện tại (10/min). Tránh chặn
 *     checkout khi Turnstile chưa setup hoặc đang down.
 *   - Nếu đã config nhưng verify fail (invalid/expired token, network error) →
 *     throw để route trả lỗi cho client (KHÔNG fallback "cho qua", vì đã chủ
 *     động bật anti-fraud).
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type TurnstileVerifyResult = {
  success: boolean
  errorCodes?: string[]
}

/** True khi đã cấu hình secret key — route sẽ enforce verify. */
export function isTurnstileConfigured(): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY)
}

/**
 * Verify token với Cloudflare Turnstile siteverify API.
 *
 * @param token - giá trị field `cf-turnstile-response` từ client form.
 * @param remoteIp - IP client (optional, tăng độ chính xác theo Cloudflare docs).
 * @throws Error nếu network error hoặc response không parse được (caller nên
 *         catch + map sang AppError phù hợp, KHÔNG để lộ raw error cho client).
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    throw new Error('TURNSTILE_SECRET_KEY chưa config')
  }

  const body = new URLSearchParams({ secret: secretKey, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)

  let resp: Response
  try {
    resp = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'turnstile: network error')
    throw new Error(`Turnstile network error: ${(err as Error).message}`)
  }

  if (!resp.ok) {
    logger.warn({ status: resp.status }, 'turnstile: siteverify non-2xx response')
    throw new Error(`Turnstile siteverify HTTP ${resp.status}`)
  }

  const json = (await resp.json()) as { success: boolean; 'error-codes'?: string[] }
  return { success: json.success, errorCodes: json['error-codes'] }
}
