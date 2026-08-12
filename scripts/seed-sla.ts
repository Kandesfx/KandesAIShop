/**
 * scripts/seed-sla.ts — Seed default SLA config + notification templates.
 * Chạy sau khi migrate xong.
 *
 * Usage:
 *   npx tsx scripts/seed-sla.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main(): Promise<void> {
  console.log('🌱 Seeding SLA config + Notification templates...\n')

  // 1. Seed SLA Config (global)
  const existingSla = await db.slaConfig.findFirst({ where: { scopeType: 'global' } })
  if (existingSla) {
    console.log('⚠️  SLA Config global đã tồn tại — skip')
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
    console.log(`✅ SLA Config created (id=${sla.id})`)
    console.log(`   Level 1: ${sla.threshold1Minutes} phút → telegram, email`)
    console.log(`   Level 2: ${sla.threshold2Minutes} phút → telegram, email`)
    console.log(`   Level 3: ${sla.threshold3Minutes} phút → telegram, email`)
  }

  // 2. Seed Notification Templates (email + telegram, vi + en)
  const events = [
    'order.created',
    'order.paid',
    'order.delivered',
    'order.cancelled',
    'order.refunded',
    'sla.breach',
  ] as const

  const channels = ['email', 'telegram'] as const
  const languages = ['vi', 'en'] as const

  let templatesCreated = 0

  for (const event of events) {
    for (const channel of channels) {
      for (const language of languages) {
        const existing = await db.notificationTemplate.findFirst({
          where: { code: event, channel, language },
        })
        if (existing) continue

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
        templatesCreated++
      }
    }
  }

  console.log(`\n✅ Created ${templatesCreated} notification template(s)`)

  console.log('\n🎉 Seed hoàn tất!')
  console.log('\nTruy cập admin: https://kandes.shop/admin')
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
      return `<p>⚠️ Cảnh báo SLA!</p><p>Đơn #{{orderNumber}} đã quá hạn {{minutesOver}} phút.</p><p>Ngưỡng: Level {{level}}</p>`
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
      return `<p>⚠️ SLA Alert!</p><p>Order #{{orderNumber}} is {{minutesOver}} minutes overdue.</p><p>Level: {{level}}</p>`
    default:
      return ''
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
