import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok, fail } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me — Trả về user hiện tại hoặc null.
 * Không require auth (intentional) — UI dùng để biết có session hay không.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    return ok({
      user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null,
    })
  } catch (err) {
    return fail(err, req)
  }
}
