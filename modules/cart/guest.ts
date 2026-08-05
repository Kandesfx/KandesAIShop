import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { env } from '../../lib/env'

/**
 * Guest cart helpers — Phase 2.
 *
 * Cookie `kds_cart` chứa opaque guest token (32 bytes hex).
 * Server tìm `Cart` row theo `guestToken`. Token tự sinh khi user thêm item
 * đầu tiên (không cần flow "create cart").
 *
 * TTL: 30 ngày (BR thường cho guest cart là 7-30 ngày; chọn 30 cho UX).
 * Cookie flags: httpOnly, secure(prod), sameSite=lax, path=/ (mọi API route
 * đều cần đọc được).
 */

export const GUEST_CART_COOKIE = 'kds_cart'
export const GUEST_CART_TTL_SEC = 30 * 24 * 60 * 60

export function generateGuestToken(): string {
  return randomBytes(32).toString('hex')
}

export function readGuestToken(): string | null {
  return cookies().get(GUEST_CART_COOKIE)?.value ?? null
}

export function setGuestCookie(token: string): void {
  cookies().set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: GUEST_CART_TTL_SEC,
  })
}

export function clearGuestCookie(): void {
  cookies().delete(GUEST_CART_COOKIE)
}
