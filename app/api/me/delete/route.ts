import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ConflictError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/me/delete — P7-06 GDPR data deletion.
 *
 * GDPR pattern: anonymize instead of hard-delete to preserve order history for accounting.
 * What gets anonymized:
 *   - email → deleted_{userId}@anonymized.local
 *   - name → [Deleted]
 *   - phone → null
 *   - sessions → hard delete
 *   - aiApiKeys → hard delete
 *   - notifications → hard delete
 *   - cart → hard delete
 *
 * What is KEPT (anonymized):
 *   - orders (with userId) — required for accounting (5 years)
 *   - audit logs
 *
 * Auth: chỉ chính chủ mới xóa được.
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)

    // Check for active orders
    const activeOrders = await db.order.count({
      where: {
        userId: user.id,
        status: { in: ['pending', 'paid', 'processing'] },
      },
    })
    if (activeOrders > 0) {
      throw new ConflictError(
        'Không thể xóa tài khoản khi có đơn hàng đang xử lý. Hoàn thành hoặc hủy đơn trước.'
      )
    }

    const anonymized = `deleted_${user.id}@anonymized.local`

    await db.$transaction([
      // Hard delete sessions
      db.session.deleteMany({ where: { userId: user.id } }),
      // Hard delete API keys (contain real NCC keys)
      db.aiApiKey.deleteMany({ where: { userId: user.id } }),
      // Hard delete notifications
      db.notification.deleteMany({ where: { recipientUserId: user.id } }),
      // Hard delete cart
      db.cart.deleteMany({ where: { userId: user.id } }),
      // Hard delete OTP tokens
      db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      // Anonymize user (deletedAt for soft-delete audit trail)
      db.user.update({
        where: { id: user.id },
        data: {
          email: anonymized,
          name: '[Đã xóa]',
          phone: null,
          deletedAt: new Date(),
          // Keep: role, createdAt (for audit)
        },
      }),
    ])

    logger.info({ userId: user.id }, 'user: account anonymized (GDPR delete)')

    return ok({ deleted: true, message: 'Tài khoản đã được xóa.' })
  } catch (err) {
    return fail(err, req)
  }
}