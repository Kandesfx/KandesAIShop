/**
 * Notification template resolver — P5-05.
 *
 * Phase 3 hardcoded HTML templates in `templates.ts`. Phase 5 cho phép admin
 * edit templates per (event × channel × language) qua `NotificationTemplate` table.
 *
 * Resolution order:
 *   1. DB row match (event, channel, language) — if bodyTemplate not empty.
 *   2. Fallback to hardcoded `resolveTemplate()` in templates.ts.
 *
 * Variables: `{{key}}` placeholders. Example: `{{orderNumber}}`, `{{minutesOver}}`.
 * Whitelist enforced in `extractVariables()` để admin không inject arbitrary
 * strings thoát ra notification content.
 */

import { db } from '@/lib/db'
import { resolveTemplate } from './templates'
import type { NotificationEvent, NotificationData, ResolvedTemplate } from './types'

const ALLOWED_VARS = new Set([
  'orderNumber',
  'totalCents',
  'currency',
  'reason',
  'minutesOver',
  'level',
  'productName',
])

interface ResolveArgs {
  event: NotificationEvent
  channel: 'email' | 'telegram'
  language: 'vi' | 'en'
  data: NotificationData
}

export async function resolveFromDb(args: ResolveArgs): Promise<ResolvedTemplate | null> {
  const row = await db.notificationTemplate.findFirst({
    where: {
      code: args.event,
      channel: args.channel,
      language: args.language,
      isActive: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!row || !row.bodyTemplate) return null

  // bodyTemplate is HTML; for email, use HTML; for telegram, use plain text fallback.
  if (args.channel === 'email') {
    const html = interpolate(row.bodyTemplate, args.data)
    return {
      subject: row.subject ?? extractSubjectFromEvent(args.event),
      html,
      text: htmlToPlain(html),
    }
  }

  // telegram: dùng plain text representation (no HTML tags)
  const text = interpolate(stripHtmlTags(row.bodyTemplate), args.data)
  return {
    subject: row.subject ?? extractSubjectFromEvent(args.event),
    html: '',
    text,
  }
}

/**
 * Top-level resolver — try DB first, fallback to hardcoded.
 */
export async function resolveTemplateUniversal(args: ResolveArgs): Promise<ResolvedTemplate | null> {
  const fromDb = await resolveFromDb(args)
  if (fromDb) return fromDb
  // Fallback only fires for email (Phase 3 templates are HTML)
  if (args.channel === 'email') {
    return resolveTemplate(args.event, args.data)
  }
  // Channel không có fallback → return null (sẽ dead-letter)
  return null
}

/**
 * Replace `{{var}}` placeholders in a template body with values from data.
 * Unknown variables → empty string. Whitelist chỉ chấp nhận ALLOWED_VARS.
 */
export function interpolate(template: string, data: NotificationData): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    if (!ALLOWED_VARS.has(key)) return ''
    const value = (data as Record<string, unknown>)[key]
    if (value === undefined || value === null) return ''
    return escapeHtml(String(value))
  })
}

/**
 * Extract list of variables used in a template (for UI preview + validation).
 */
export function extractVariables(template: string): string[] {
  const found = new Set<string>()
  const re = /\{\{\s*(\w+)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(template)) !== null) {
    if (m[1]) found.add(m[1])
  }
  return Array.from(found)
}

/**
 * Validate template — check chỉ dùng allowed variables.
 */
export function validateTemplate(template: string): { ok: boolean; invalid: string[] } {
  const used = extractVariables(template)
  const invalid = used.filter((v) => !ALLOWED_VARS.has(v))
  return { ok: invalid.length === 0, invalid }
}

function extractSubjectFromEvent(event: NotificationEvent): string {
  const titles: Record<NotificationEvent, string> = {
    'order.created': 'Đơn hàng đã được tạo',
    'order.paid': 'Đã nhận thanh toán',
    'order.delivered': 'Đã giao đơn',
    'order.cancelled': 'Đơn đã huỷ',
    'order.refunded': 'Hoàn tiền đơn',
    'sla.breach': 'SLA breach',
  }
  return titles[event]
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function htmlToPlain(html: string): string {
  return stripHtmlTags(html)
}
