import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { authService } from '@/modules/auth'
import { clearSessionCookies } from '@/modules/auth/session'
import { ok, fail } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * POST /api/me/logout-all
 *
 * Revoke tất cả session của user → clear cookies browser hiện tại.
 * User phải đăng nhập lại.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const revoked = await authService.logoutAll(user.id)
    clearSessionCookies()
    return ok({ ok: true, revoked })
  } catch (err) {
    return fail(err, req)
  }
}
