import { NextRequest } from 'next/server'
import { getCurrentUser } from './auth'
import { fail } from './http'
import { rateLimitKey, rateLimitOrThrow } from './rate-limit'

/**
 * Helper: xác thực + role check + rate-limit theo thứ tự tối ưu.
 *
 * Thứ tự quan trọng:
 *   1. Rate-limit IP (RẺ nhất — chặn ngay từ request đầu)
 *   2. Auth (giải mã session JWT — TỐN CPU nếu spam)
 *   3. Role check (đã có user object)
 *
 * Best practice: KHÔNG BAO GIỜ gọi `getCurrentUser()` trước rate-limit vì
 * attacker spam có thể DoS bằng cách ép CPU decode JWT liên tục.
 *
 * @returns User object nếu pass, hoặc Response nếu fail (rate-limit/auth/role).
 *
 * @example
 *   const r = await authorizeAdmin(req, 'admin:orders:approve', 30, 60_000)
 *   if (r instanceof Response) return r
 *   // r.role, r.id available
 */
export async function authorizeAdmin(
  req: NextRequest,
  scope: string,
  limit: number,
  windowMs: number
) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  // 1. Rate-limit first
  try {
    await rateLimitOrThrow(rateLimitKey(scope, ip), limit, windowMs)
  } catch (err) {
    return fail(err, req)
  }

  // 2. Auth
  const user = await getCurrentUser()
  if (!user) return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)

  // 3. Role check (admin OR super_admin)
  if (!['admin', 'super_admin'].includes(user.role)) {
    return fail(
      { code: 'FORBIDDEN', message: 'Không có quyền thực hiện thao tác này' },
      req
    )
  }

  return user
}

/** Auth only (no rate-limit) — dùng cho read endpoints. */
export async function authorizeRead(req: NextRequest, roles: string[] = ['staff', 'admin', 'super_admin']) {
  const user = await getCurrentUser()
  if (!user) return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
  if (!roles.includes(user.role)) {
    return fail({ code: 'FORBIDDEN', message: 'Không có quyền xem' }, req)
  }
  return user
}
