import type { NextRequest } from 'next/server'
import { getCurrentUser } from '../auth'
import { UnauthorizedError, ForbiddenError } from '../errors'
import type { User, UserRole } from '@prisma/client'

/**
 * Middleware helpers cho Route Handlers.
 *
 * Phase 1 dùng requireRole() trực tiếp từ lib/auth.ts (vẫn chạy OK).
 * Phase 2 modules mới ưu tiên dùng withAuth/withRole trong file này để:
 *   - Thêm được rate-limit + audit metadata dễ hơn (chỗ duy nhất cần sửa)
 *   - Có thể compose: withRole(...) → withRateLimit(...) → handler
 *   - Context object { req, user, ip } truyền xuống handler, không phải
 *     parse lại từ cookie mỗi route
 *
 * Pattern sử dụng:
 *   export const POST = withRole(['staff','admin'], async ({ req, user, ip }, body) => { ... })
 */

export type AuthedContext = {
  req: NextRequest
  user: User
  ip?: string
}

/** Bắt buộc đăng nhập, throw UnauthorizedError nếu thiếu. */
export async function authGuard(req: NextRequest): Promise<AuthedContext> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined
  return { req, user, ip }
}

/** Bắt buộc role, throw ForbiddenError nếu sai role. */
export async function rbacGuard(req: NextRequest, allowed: UserRole[]) {
  const { user, ip } = await authGuard(req)
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(`Yêu cầu role: ${allowed.join(', ')}`)
  }
  return { req, user, ip }
}

/**
 * Wrap một Route Handler yêu cầu đăng nhập.
 * Handler nhận ctx = { req, user, ip }.
 */
export function withAuth<TBody = unknown, TResp = unknown>(
  handler: (ctx: AuthedContext, body: TBody) => Promise<TResp>
) {
  return async (req: NextRequest): Promise<TResp> => {
    const ctx = await authGuard(req)
    let body: TBody = undefined as TBody
    // Chỉ parse body cho method có body. HEAD/GET thì bỏ qua.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = (await req.json()) as TBody
      } catch {
        body = undefined as TBody
      }
    }
    return handler(ctx, body)
  }
}

/**
 * Wrap một Route Handler yêu cầu role cụ thể.
 */
export function withRole<TBody = unknown, TResp = unknown>(
  allowed: UserRole[],
  handler: (ctx: AuthedContext, body: TBody) => Promise<TResp>
) {
  return async (req: NextRequest): Promise<TResp> => {
    const ctx = await rbacGuard(req, allowed)
    let body: TBody = undefined as TBody
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = (await req.json()) as TBody
      } catch {
        body = undefined as TBody
      }
    }
    return handler(ctx, body)
  }
}
