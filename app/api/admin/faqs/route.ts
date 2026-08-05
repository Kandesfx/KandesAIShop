import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { faqService, createFaqSchema, updateFaqSchema } from '@/modules/faq'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/faqs?status=&category=&page=&limit=
 * POST /api/admin/faqs — create
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:faqs:list', ip, user.id), 60, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
    const status = searchParams.get('status') ?? undefined
    const category = searchParams.get('category') ?? undefined

    const result = await faqService.listAdmin({ page, limit, status, category })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:faqs:create', ip, user.id), 30, 60 * 1000)

    const body = (await req.json().catch(() => null)) as unknown
    const parsed = createFaqSchema.safeParse(body)
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
    const faq = await faqService.create(parsed.data)
    return NextResponse.json({ ok: true, data: faq }, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}

// Silence unused
void updateFaqSchema
