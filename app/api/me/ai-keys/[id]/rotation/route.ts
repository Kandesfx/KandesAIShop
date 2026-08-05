import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { updateRotationSchema } from '@/modules/ai-gateway/validators'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/me/ai-keys/[id]/rotation — Phase 7-RB (D55).
 *
 * KH đổi rotation policy + (optional) pin 1 NCC key cụ thể.
 *
 * Auth: chỉ chủ sở hữu apiKey mới update được.
 * Validate:
 *   - rotationPolicy='pinned' → pinnedNccKeyId bắt buộc.
 *   - Pinned NCC key phải còn `active` hoặc `low_balance`.
 *   - KHÔNG expose NCC key plaintext trong response.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)
    const { id } = await params
    const input = updateRotationSchema.parse(await req.json())

    const apiKey = await db.aiApiKey.findUnique({
      where: { id },
      include: { pinnedNccKey: true },
    })
    if (!apiKey || apiKey.userId !== user.id) {
      throw new NotFoundError('API key không tồn tại')
    }

    if (input.rotationPolicy === 'pinned') {
      if (!input.pinnedNccKeyId) {
        throw new ValidationError('pinnedNccKeyId bắt buộc khi rotationPolicy=pinned')
      }
      const pinnedKey = await db.aiNccKey.findUnique({ where: { id: input.pinnedNccKeyId } })
      if (!pinnedKey) {
        throw new NotFoundError('NCC key không tồn tại')
      }
      if (pinnedKey.status === 'exhausted' || pinnedKey.status === 'disabled') {
        throw new ValidationError(`NCC key đang ${pinnedKey.status}, không thể pin`)
      }
    }

    const updated = await db.aiApiKey.update({
      where: { id },
      data: {
        rotationPolicy: input.rotationPolicy,
        pinnedNccKeyId: input.rotationPolicy === 'auto' ? null : input.pinnedNccKeyId ?? null,
      },
      select: {
        id: true,
        rotationPolicy: true,
        pinnedNccKeyId: true,
        pinnedNccKey: { select: { id: true, nickname: true, remainingUsd: true, totalQuotaUsd: true } },
      },
    })

    logger.info(
      { apiKeyId: id, userId: user.id, rotationPolicy: input.rotationPolicy },
      'user: updated API key rotation policy'
    )

    return ok({
      apiKeyId: updated.id,
      rotationPolicy: updated.rotationPolicy,
      pinnedNccKeyId: updated.pinnedNccKeyId,
      pinnedNccKey: updated.pinnedNccKey
        ? {
            nickname: updated.pinnedNccKey.nickname,
            remainingUsd: Number(updated.pinnedNccKey.remainingUsd),
            totalQuotaUsd: Number(updated.pinnedNccKey.totalQuotaUsd),
          }
        : null,
    })
  } catch (err) {
    return fail(err, req)
  }
}