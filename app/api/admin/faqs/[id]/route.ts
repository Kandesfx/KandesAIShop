import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { faqService, updateFaqSchema } from '@/modules/faq'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/** GET /api/admin/faqs/[id] */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const { id } = await params
    const faq = await faqService.getById(id)
    return ok(faq)
  } catch (err) {
    return fail(err, req)
  }
}

/** PATCH /api/admin/faqs/[id] */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:faqs:update', ip, user.id), 30, 60 * 1000)

    const { id } = await params
    const body = (await req.json().catch(() => null)) as unknown
    const parsed = updateFaqSchema.safeParse(body)
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
    const faq = await faqService.update(id, parsed.data)
    return ok(faq)
  } catch (err) {
    return fail(err, req)
  }
}

/** DELETE /api/admin/faqs/[id] */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:faqs:delete', ip, user.id), 30, 60 * 1000)

    const { id } = await params
    await faqService.delete(id)
    return ok({ id, deleted: true })
  } catch (err) {
    return fail(err, req)
  }
}
