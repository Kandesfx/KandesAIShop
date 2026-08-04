import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, parseInput } from '@/lib/http'
import { rbacGuard } from '@/lib/middleware/auth'
import { NotFoundError } from '@/lib/errors'
import { updateNccKeySchema } from '@/modules/ai-gateway/validators'
import { getNccKey, updateNccKey } from '@/modules/ai-gateway/ncc-keys'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/ncc-keys/[id] — get 1 NCC key.
 * PATCH /api/admin/ai/ncc-keys/[id] — update nickname/status.
 *
 * Permission: admin / super_admin.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])
    const { id } = await params
    const key = await getNccKey(id)
    if (!key) throw new NotFoundError('NCC key không tồn tại')
    return ok(serialize(key))
  } catch (err) {
    return fail(err, req)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])
    const { id } = await params
    const input = parseInput(updateNccKeySchema, await req.json())
    const updated = await updateNccKey(id, input)
    return ok(serialize(updated))
  } catch (err) {
    return fail(err, req)
  }
}