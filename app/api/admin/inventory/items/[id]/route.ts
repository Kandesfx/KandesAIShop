import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { NotFoundError, ForbiddenError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/inventory/items/[id]
 *
 * Chi tiết 1 inventory item — admin only.
 * KHÔNG trả valueEncrypted (đã mã hoá nhưng vẫn là secret).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser()
    await rateLimitOrThrow(rateLimitKey('admin:inventory:detail', user.id), 60, 60 * 1000)

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenError('Chỉ admin')
    }

    const item = await db.inventoryItem.findUnique({
      where: { id: params.id },
      include: {
        product: { select: { name: true, sku: true, deliveryStrategy: true } },
        variant: { select: { name: true, sku: true } },
      },
    })

    if (!item) throw new NotFoundError('Không tìm thấy item')

    return ok({
      item: {
        id: item.id,
        batchId: item.batchId,
        productId: item.productId,
        variantId: item.variantId,
        product: item.product,
        variant: item.variant,
        fingerprint: item.fingerprint,
        status: item.status,
        reservedForOrderId: item.reservedForOrderId,
        reservedAt: item.reservedAt?.toISOString() ?? null,
        deliveredAt: item.deliveredAt?.toISOString() ?? null,
        returnedAt: item.returnedAt?.toISOString() ?? null,
        expiresAt: item.expiresAt?.toISOString() ?? null,
        metadata: item.metadata,
        createdAt: item.createdAt.toISOString(),
      },
    })
  } catch (err) {
    return fail(err, req)
  }
}
