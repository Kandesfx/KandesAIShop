import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { validateTemplate } from '@/modules/notification/templates-db'

export const dynamic = 'force-dynamic'

const listQuerySchema = z.object({
  channel: z.enum(['email', 'telegram', 'zalo', 'sms', 'voice']).optional(),
  language: z.enum(['vi', 'en']).default('vi'),
})

/**
 * GET /api/admin/notification-templates
 * Returns edits + active flag per (code, channel, language).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const { searchParams } = new URL(req.url)
    const parsed = listQuerySchema.safeParse({
      channel: searchParams.get('channel') ?? undefined,
      language: searchParams.get('language') ?? 'vi',
    })
    if (!parsed.success) {
      return fail({ code: 'VALIDATION_ERROR', message: 'Query không hợp lệ' }, req)
    }

    const where: Record<string, unknown> = { language: parsed.data.language }
    if (parsed.data.channel) where.channel = parsed.data.channel

    const rows = await db.notificationTemplate.findMany({
      where,
      orderBy: [{ code: 'asc' }, { channel: 'asc' }],
    })

    return ok({ items: rows.map(toView) })
  } catch (err) {
    return fail(err, req)
  }
}

const upsertSchema = z.object({
  code: z.string().min(1),
  channel: z.enum(['email', 'telegram', 'zalo', 'sms', 'voice']),
  language: z.enum(['vi', 'en']).default('vi'),
  subject: z.string().max(500).optional(),
  bodyTemplate: z.string().min(1).max(20000),
  isActive: z.boolean().default(true),
})

/**
 * POST /api/admin/notification-templates
 * Upsert (code, channel, language) → unique key.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:templates:upsert', ip, user.id), 30, 60 * 1000)

    const body = (await req.json().catch(() => null)) as unknown
    const parsed = upsertSchema.safeParse(body)
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

    const validation = validateTemplate(parsed.data.bodyTemplate)
    if (!validation.ok) {
      return fail(
        {
          code: 'INVALID_TEMPLATE',
          message: `Biến không hợp lệ: ${validation.invalid.join(', ')}`,
        },
        req
      )
    }

    const row = await db.notificationTemplate.upsert({
      where: {
        code_channel_language: {
          code: parsed.data.code,
          channel: parsed.data.channel,
          language: parsed.data.language,
        },
      },
      create: {
        code: parsed.data.code,
        channel: parsed.data.channel,
        language: parsed.data.language,
        subject: parsed.data.subject ?? null,
        bodyTemplate: parsed.data.bodyTemplate,
        isActive: parsed.data.isActive,
      },
      update: {
        subject: parsed.data.subject ?? null,
        bodyTemplate: parsed.data.bodyTemplate,
        isActive: parsed.data.isActive,
      },
    })

    await db.auditLog.create({
      data: {
        actorId: user.id,
        actorType: 'admin',
        action: 'notification_template.upsert',
        resourceType: 'notification_template',
        resourceId: row.id,
        payload: {
          code: parsed.data.code,
          channel: parsed.data.channel,
          language: parsed.data.language,
        },
      },
    })

    return NextResponse.json({ ok: true, data: toView(row) }, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}

interface TemplateRow {
  id: string
  code: string
  channel: string
  language: string
  subject: string | null
  bodyTemplate: string
  isActive: boolean
  updatedAt: Date
}

function toView(row: TemplateRow) {
  return {
    id: row.id,
    code: row.code,
    channel: row.channel,
    language: row.language,
    subject: row.subject,
    bodyTemplate: row.bodyTemplate,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  }
}
