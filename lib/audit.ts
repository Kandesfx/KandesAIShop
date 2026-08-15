import { NextRequest } from 'next/server'
import { auditService } from '@/modules/audit'
import { getClientIp } from './http'

/**
 * Audit-log một admin action từ route handler.
 *
 * Helper này catch error internally — audit log KHÔNG BAO GIỜ block luồng
 * chính. Nếu write fail, log error qua console để admin debug.
 *
 * Best practice: gọi NGAY SAU khi mutate thành công (không trong try)
 * để tránh log action chưa hoàn tất.
 *
 * @example
 *   await db.product.update({ ... })
 *   await auditFromRequest(req, user, {
 *     action: 'product.update',
 *     resourceType: 'product',
 *     resourceId: id,
 *     payload: { before, after }
 *   })
 */
export async function auditFromRequest(
  req: NextRequest,
  actor: { id: string; role: string },
  input: {
    action: string
    resourceType?: string
    resourceId?: string
    payload?: unknown
  }
): Promise<void> {
  try {
    await auditService.record({
      actorId: actor.id,
      actorType: actor.role === 'customer' ? 'user' : 'admin',
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ipAddress: getClientIp(req),
      userAgent: req.headers.get('user-agent') ?? undefined,
      payload: input.payload,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] failed to write audit log', { err, action: input.action })
  }
}
