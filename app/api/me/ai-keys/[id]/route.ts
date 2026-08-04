import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { NotFoundError } from '@/lib/errors'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/me/ai-keys/[id] — xoá key của user hiện tại.
 *
 * Hard delete — KHÔNG soft delete (free prefix cho user khác dùng lại).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)
    const { id } = await params

    const key = await db.aiApiKey.findUnique({ where: { id } })
    if (!key) throw new NotFoundError('API key không tồn tại')
    if (key.userId !== user.id) throw new NotFoundError('API key không tồn tại')

    await db.aiApiKey.delete({ where: { id } })

    logger.info({ apiKeyId: id, userId: user.id }, 'user: deleted API key')

    return ok({ deleted: true })
  } catch (err) {
    return fail(err, req)
  }
}