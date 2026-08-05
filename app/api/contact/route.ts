import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { createContactSchema, contactService } from '@/modules/contact'

export const dynamic = 'force-dynamic'

/**
 * POST /api/contact
 * Public — submit contact form.
 * Strict rate-limit (10/IP/giờ) để chống spam.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('public:contact:submit', ip), 10, 60 * 60 * 1000)

    const body = (await req.json().catch(() => null)) as unknown
    const parsed = createContactSchema.safeParse(body)
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

    const userAgent = req.headers.get('user-agent') ?? undefined
    const result = await contactService.create({
      ...parsed.data,
      ipAddress: ip,
      userAgent,
    })
    return NextResponse.json({ ok: true, data: result }, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}

/** GET — health check endpoint (public). */
export async function GET() {
  return ok({ status: 'ok' })
}
