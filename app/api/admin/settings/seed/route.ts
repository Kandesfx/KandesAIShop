import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { settingsService, seedSettingsSchema } from '@/modules/settings'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/settings/seed
 * Idempotent seed defaults. Chỉ super_admin được gọi.
 * Nếu force=true: upsert (overwrite existing). Mặc định skip existing.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
      return fail({ code: 'FORBIDDEN', message: 'Chỉ super_admin' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(
      rateLimitKey('admin:settings:seed', ip, user.id),
      5,
      60 * 1000
    )

    const body = await req.json().catch(() => ({}))
    const parsed = seedSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          fields: parsed.error.flatten().fieldErrors,
        },
        req
      )
    }

    const result = await settingsService.seedDefaults()
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
