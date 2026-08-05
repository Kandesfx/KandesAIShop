import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { getCurrentUser } from '@/lib/auth'
import { notificationAdmin } from '@/modules/notification/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  status: z.enum(['queued', 'sent', 'delivered', 'failed', 'bounced']).optional(),
  channel: z.string().optional(),
  event: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * GET /api/admin/notifications — list + filter + pagination.
 * Cần admin.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const { searchParams } = new URL(req.url)
    const parsed = querySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      channel: searchParams.get('channel') ?? undefined,
      event: searchParams.get('event') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    })
    if (!parsed.success) {
      return fail(
        { code: 'VALIDATION_ERROR', message: 'Query không hợp lệ' },
        req
      )
    }

    const result = await notificationAdmin.listAdmin({
      ...parsed.data,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
    })

    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
