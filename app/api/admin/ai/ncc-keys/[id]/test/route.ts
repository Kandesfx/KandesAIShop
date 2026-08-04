import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rbacGuard } from '@/lib/middleware/auth'
import { NotFoundError } from '@/lib/errors'
import { getNccKey } from '@/modules/ai-gateway/ncc-keys'
import { getProvider } from '@/modules/ai-gateway/providers'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/ai/ncc-keys/[id]/test
 *
 * Test connection — Phase 6 chỉ test được `ccpro` (provider factory).
 * Các provider khác sẽ throw 'chưa implement'.
 *
 * Body: { provider?: 'ccpro' } — optional override (default = key.provider).
 *
 * Permission: admin / super_admin.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])
    const { id } = await params
    const key = await getNccKey(id)
    if (!key) throw new NotFoundError('NCC key không tồn tại')

    const provider = getProvider(key.provider)
    const result = await provider.testConnection()

    logger.info(
      { nccKeyId: id, provider: key.provider, ok: result.ok },
      'admin: tested NCC provider connection'
    )

    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}