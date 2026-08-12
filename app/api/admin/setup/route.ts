/**
 * POST /api/admin/setup
 *
 * Temporary setup route to seed admin + SLA config on first deploy.
 * Delete this file after use!
 *
 * Usage:
 *   curl -X POST https://kandes.shop/api/admin/setup \
 *     -H "Content-Type: application/json" \
 *     -d '{"secret":"KDS-SETUP-2026","adminEmail":"admin@kandes.shop","adminPassword":"Kandesfox110205@"}'
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'

const SETUP_SECRET = 'KDS-SETUP-2026'

export async function POST(req: NextRequest) {
  // 1. Verify secret
  const body = await req.json().catch(() => ({}))
  if (body.secret !== SETUP_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const { adminEmail, adminPassword } = body
  if (!adminEmail || !adminPassword) {
    return Response.json({ error: 'Missing adminEmail or adminPassword' }, { status: 400 })
  }

  const results: { admin: any; sla: any; templates: number } = {
    admin: null,
    sla: null,
    templates: 0,
  }

  // 2. Create admin user
  try {
    const existing = await db.user.findUnique({ where: { email: adminEmail } })
    if (existing) {
      results.admin = { skipped: true, email: existing.email, role: existing.role }
    } else {
      const passwordHash = await hashPassword(adminPassword)
      const user = await db.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: 'Kandes Admin',
          role: 'super_admin',
          status: 'active',
          emailVerifiedAt: new Date(),
        },
        select: { id: true, email: true, name: true, role: true },
      })
      results.admin = user
    }
  } catch (err) {
    return Response.json({ error: 'Failed to create admin', detail: String(err) }, { status: 500 })
  }

  // 3. Create SLA config
  try {
    const existingSla = await db.slaConfig.findFirst({ where: { scopeType: 'global' } })
    if (existingSla) {
      results.sla = { skipped: true, id: existingSla.id }
    } else {
      const sla = await db.slaConfig.create({
        data: {
          scopeType: 'global',
          deliveryStrategy: 'MANUAL_KEY',
          threshold1Minutes: 5,
          threshold1Channels: ['telegram', 'email'],
          threshold2Minutes: 15,
          threshold2Channels: ['telegram', 'email'],
          threshold3Minutes: 30,
          threshold3Channels: ['telegram', 'email'],
          isActive: true,
        },
      })
      results.sla = sla
    }
  } catch (err) {
    return Response.json({ error: 'Failed to create SLA config', detail: String(err) }, { status: 500 })
  }

  // 4. Seed notification templates
  try {
    const events = [
      'order.created',
      'order.paid',
      'order.delivered',
      'order.cancelled',
      'order.refunded',
      'sla.breach',
    ] as const

    for (const event of events) {
      for (const channel of ['email', 'telegram'] as const) {
        for (const language of ['vi', 'en'] as const) {
          const existing = await db.notificationTemplate.findFirst({
            where: { code: event, channel, language },
          })
          if (!existing) {
            await db.notificationTemplate.create({
              data: {
                code: event,
                channel,
                language,
                subject: getSubject(event, language),
                bodyTemplate: getBody(event, language),
                isActive: true,
              },
            })
            results.templates++
          }
        }
      }
    }
  } catch (err) {
    return Response.json({ error: 'Failed to create templates', detail: String(err) }, { status: 500 })
  }

  return Response.json({
    success: true,
    message: 'Setup complete! Delete this route after use.',
    results,
  })
}

function getSubject(event: string, lang: string): string {
  const subjects: Record<string, Record<string, string>> = {
    'order.created': { vi: 'Đơn hàng đã được tạo', en: 'Order Created' },
    'order.paid': { vi: 'Đã nhận thanh toán', en: 'Payment Received' },
    'order.delivered': { vi: 'Đã giao đơn hàng', en: 'Order Delivered' },
    'order.cancelled': { vi: 'Đơn hàng đã bị huỷ', en: 'Order Cancelled' },
    'order.refunded': { vi: 'Hoàn tiền đơn hàng', en: 'Refund Processed' },
    'sla.breach': { vi: 'Cảnh báo: Đơn hàng quá hạn SLA', en: 'Alert: Order SLA Breach' },
  }
  return subjects[event]?.[lang] ?? event
}

function getBody(event: string, lang: string): string {
  if (lang === 'en') {
    return getBodyEn(event)
  }
  return getBodyVi(event)
}

function getBodyVi(event: string): string {
  switch (event) {
    case 'order.created':
      return `<p>Xin chào!</p><p>Cảm ơn bạn đã đặt hàng. Đơn #{{orderNumber}} đã được tạo thành công.</p><p>Tổng giá trị: {{totalCents}} {{currency}}</p><p>Chúng tôi sẽ xử lý đơn hàng trong vài phút tới.</p>`
    case 'order.paid':
      return `<p>Chúng tôi đã nhận thanh toán {{totalCents}} {{currency}} cho đơn #{{orderNumber}}.</p><p>Đơn hàng đang được xử lý.</p>`
    case 'order.delivered':
      return `<p>Đơn #{{orderNumber}} đã được giao thành công!</p><p>Sản phẩm kỹ thuật số đã có trong tài khoản của bạn.</p>`
    case 'order.cancelled':
      return `<p>Đơn #{{orderNumber}} đã bị huỷ.</p>{{#if reason}}<p>Lý do: {{reason}}</p>{{/if}}`
    case 'order.refunded':
      return `<p>Hoàn tiền {{totalCents}} {{currency}} cho đơn #{{orderNumber}} đã được xử lý.</p>{{#if reason}}<p>Lý do: {{reason}}</p>{{/if}}`
    case 'sla.breach':
      return `<p>Cảnh báo SLA!</p><p>Đơn #{{orderNumber}} đã quá hạn {{minutesOver}} phút.</p><p>Ngưỡng: Level {{level}}</p>`
    default:
      return ''
  }
}

function getBodyEn(event: string): string {
  switch (event) {
    case 'order.created':
      return `<p>Hello!</p><p>Thank you for your order. Order #{{orderNumber}} has been created successfully.</p><p>Total: {{totalCents}} {{currency}}</p>`
    case 'order.paid':
      return `<p>We received payment of {{totalCents}} {{currency}} for order #{{orderNumber}}.</p><p>Your order is being processed.</p>`
    case 'order.delivered':
      return `<p>Order #{{orderNumber}} has been delivered!</p><p>Your digital product is now available in your account.</p>`
    case 'order.cancelled':
      return `<p>Order #{{orderNumber}} has been cancelled.</p>{{#if reason}}<p>Reason: {{reason}}</p>{{/if}}`
    case 'order.refunded':
      return `<p>Refund of {{totalCents}} {{currency}} for order #{{orderNumber}} has been processed.</p>{{#if reason}}<p>Reason: {{reason}}</p>{{/if}}`
    case 'sla.breach':
      return `<p>SLA Alert!</p><p>Order #{{orderNumber}} is {{minutesOver}} minutes overdue.</p><p>Level: {{level}}</p>`
    default:
      return ''
  }
}
