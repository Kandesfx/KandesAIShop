import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, getCurrentSessionId } from '@/lib/auth'
import { ok, fail, parseInput } from '@/lib/http'
import { verifyPassword, hashPassword, validatePassword } from '@/modules/auth/password'
import { revokeAllUserSessions } from '@/modules/auth/session'
import { clearSessionCookies } from '@/modules/auth/session'
import { UnauthorizedError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/me/password
 *
 * Body: { currentPassword, newPassword }
 *
 * Verify mật khẩu hiện tại → hash mật khẩu mới → update.
 * Sau khi đổi: revoke TẤT CẢ session (force logout all devices) → clear cookies
 * để browser hiện tại cũng bị đăng xuất. User phải login lại.
 */
const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const input = parseInput(schema, body)

    if (!user.passwordHash) {
      throw new UnauthorizedError(
        'Tài khoản đăng nhập bằng OAuth không thể đổi mật khẩu tại đây.'
      )
    }

    const okPw = await verifyPassword(user.passwordHash, input.currentPassword)
    if (!okPw) {
      throw new UnauthorizedError('Mật khẩu hiện tại không đúng')
    }

    validatePassword(input.newPassword) // Throw nếu không đạt BR-4.2

    const newHash = await hashPassword(input.newPassword)

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    // Force logout all sessions (kể cả session hiện tại)
    await revokeAllUserSessions(user.id)
    // Cũng xoá session cookie của browser hiện tại
    void getCurrentSessionId // referenced for clarity
    clearSessionCookies()

    return ok({ ok: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' })
  } catch (err) {
    return fail(err, req)
  }
}
