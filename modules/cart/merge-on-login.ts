import { NextResponse } from 'next/server'
import { cartService } from './service'
import { readGuestToken } from './guest'

/**
 * Helper gọi từ các auth route sau khi user vừa đăng nhập.
 *
 * Merge guest cart (nếu có) vào user cart. Best-effort — lỗi merge KHÔNG
 * fail login flow (chỉ log warn). User vẫn đăng nhập thành công.
 */
export async function postLoginMerge(userId: string): Promise<void> {
  const guestToken = readGuestToken()
  if (!guestToken) return
  try {
    await cartService.mergeGuestCartToUser(userId, guestToken)
  } catch (err) {
    // Không throw — chỉ log để debug
    // eslint-disable-next-line no-console
    console.warn('[cart] postLoginMerge failed:', (err as Error).message)
  }
}
