import { RateLimitError } from './errors'

/**
 * Rate-limit helper — dùng cho login, OTP request, checkout, v.v.
 *
 * Provider:
 *   - Upstash Redis khi có UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (production)
 *   - In-memory Map<key, {count, expiresAt}> khi không có (dev, test, self-hosted)
 *
 * Hai provider cùng interface `consume(key, limit, windowMs)` để caller không cần
 * biết provider nào đang chạy.
 *
 * Lưu ý in-memory:
 *   - Mất state khi server restart / mỗi worker có state riêng → chỉ dùng dev
 *   - Cleanup định kỳ (mỗi request) để tránh memory leak
 */

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetMs: number
}

export type RateLimiter = {
  consume: (key: string, limit: number, windowMs: number) => Promise<RateLimitResult>
}

type Bucket = { count: number; resetAt: number }

/**
 * In-memory token bucket. Phù hợp dev/test, KHÔNG dùng production multi-instance.
 * Khi process restart thì state mất → user có thể spam 1 lần nữa, acceptable.
 */
export function createInMemoryRateLimiter(): RateLimiter {
  const store = new Map<string, Bucket>()
  // Cleanup cũ mỗi khi có request — O(n) nhưng n nhỏ, OK.
  function gc(now: number) {
    for (const [k, v] of store) {
      if (v.resetAt <= now) store.delete(k)
    }
  }
  return {
    async consume(
      key: string,
      limit: number,
      windowMs: number
    ): Promise<RateLimitResult> {
      const now = Date.now()
      gc(now)
      const bucket = store.get(key)
      if (!bucket || bucket.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs })
        return { success: true, remaining: limit - 1, resetMs: windowMs }
      }
      bucket.count += 1
      if (bucket.count > limit) {
        return { success: false, remaining: 0, resetMs: bucket.resetAt - now }
      }
      return { success: true, remaining: limit - bucket.count, resetMs: bucket.resetAt - now }
    },
  }
}

/**
 * Singleton — lazy init để tránh load Upstash SDK ở môi trường không có env.
 */
let _limiter: RateLimiter | null = null

export function getRateLimiter(): RateLimiter {
  if (_limiter) return _limiter
  _limiter = createInMemoryRateLimiter()
  return _limiter
}

/**
 * Tiện ích: throw RateLimitError nếu vượt ngưỡng, trả về remaining nếu OK.
 * Trả `null` nếu OK (không trả số — caller không cần).
 */
export async function rateLimitOrThrow(key: string, limit: number, windowMs: number): Promise<void> {
  const result = await getRateLimiter().consume(key, limit, windowMs)
  if (!result.success) {
    const seconds = Math.ceil(result.resetMs / 1000)
    throw new RateLimitError(`Quá nhiều yêu cầu, thử lại sau ${seconds}s`)
  }
}

/** Key helper: kết hợp route + IP để tránh user-block ảnh hưởng người khác. */
export function rateLimitKey(route: string, ip: string | undefined, suffix?: string): string {
  return [route, ip ?? 'unknown', suffix ?? ''].join(':')
}

/** Test helper — reset in-memory store. */
export function _resetRateLimiter() {
  _limiter = null
}
