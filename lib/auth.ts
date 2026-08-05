import { db } from './db'
import { getAccessPayload } from '../modules/auth/session'
import { UnauthorizedError, ForbiddenError } from './errors'
import type { User, UserRole } from '@prisma/client'

/**
 * Authentication layer — Phase 2.
 *
 * Cookie kds_access chứa JWT access token (15 phút). Verify offline qua
 * SESSION_SECRET. Cookie kds_refresh (path scoped) chứa opaque refresh token
 * rotate qua Session table.
 *
 * Function `getCurrentUser` chỉ verify access token + load user từ DB.
 * Function `requireUser` throw 401 nếu thiếu. Dùng cho Server Components
 * và Route Handlers.
 *
 * Logout / rotate dùng modules/auth/session trực tiếp.
 */

export async function getCurrentUser(): Promise<User | null> {
  const payload = await getAccessPayload()
  if (!payload) return null
  const user = await db.user.findUnique({ where: { id: payload.uid } })
  if (!user || user.status !== 'active' || user.deletedAt) return null
  return user
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}

export async function requireRole(...allowed: UserRole[]): Promise<User> {
  const user = await requireUser()
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(`Yêu cầu role: ${allowed.join(', ')}`)
  }
  return user
}

/** Read-only — không throw, dùng cho UI render. */
export async function getOptionalUser(): Promise<User | null> {
  return getCurrentUser()
}

/** Lấy session id từ access token, dùng cho logout. */
export async function getCurrentSessionId(): Promise<string | null> {
  const payload = await getAccessPayload()
  return payload?.sid ?? null
}
