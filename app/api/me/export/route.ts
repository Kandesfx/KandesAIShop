import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/export — P7-06 GDPR data export.
 *
 * Trả về tất cả dữ liệu cá nhân của user dưới dạng JSON.
 * Auth: chỉ chính chủ mới export được.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)

    const [userData, orders, apiKeys, sessions, notifications, cart] = await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          // Exclude sensitive fields
        },
      }),
      db.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      db.aiApiKey.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          lastUsedAt: true,
        },
      }),
      db.session.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          expiresAt: true,
          createdAt: true,
          userAgent: true,
        },
      }),
      db.notification.findMany({
        where: { recipientUserId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.cart.findFirst({
        where: { userId: user.id },
      }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: userData,
      orders: orders.map((o) => serialize(o)),
      apiKeys: serialize(apiKeys),
      sessions: serialize(sessions),
      notifications: serialize(notifications),
      cart: serialize(cart),
    }

    logger.info({ userId: user.id }, 'user: data export requested')

    return new NextResponse(JSON.stringify(exportData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="kandes-data-${user.id}.json"`,
      },
    })
  } catch (err) {
    return fail(err, req)
  }
}