import { NextRequest } from 'next/server'
import { authService } from '@/modules/auth'
import { clearSessionCookies } from '@/modules/auth/session'
import { getCurrentSessionId } from '@/lib/auth'
import { ok, fail } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/logout
 *
 * Revoke session hiện tại (DB) + xoá cookies.
 * Nếu không có session → vẫn xoá cookies + return ok (idempotent).
 */
export async function POST(req: NextRequest) {
  try {
    const sessionId = await getCurrentSessionId()
    await authService.logout(sessionId)
    clearSessionCookies()
    return ok({ ok: true })
  } catch (err) {
    return fail(err, req)
  }
}
