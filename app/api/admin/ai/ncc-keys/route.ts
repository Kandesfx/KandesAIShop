import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, parseInput } from '@/lib/http'
import { rbacGuard } from '@/lib/middleware/auth'
import { listNccKeysSchema, addNccKeySchema } from '@/modules/ai-gateway/validators'
import { listNccKeys, addNccKey } from '@/modules/ai-gateway/ncc-keys'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/ncc-keys — list NCC key pool (admin).
 * POST /api/admin/ai/ncc-keys — add new NCC key (plaintext → encrypt).
 *
 * Permission: admin / super_admin.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const input = parseInput(listNccKeysSchema, query)
    const { items, total } = await listNccKeys({
      page: input.page,
      pageSize: input.pageSize,
      ...(input.status ? { status: input.status } : {}),
      ...(input.provider ? { provider: input.provider as Parameters<typeof listNccKeys>[0]['provider'] } : {}),
    })
    return ok(serialize({ items, total, page: input.page, pageSize: input.pageSize }))
  } catch (err) {
    return fail(err, req)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])
    const input = parseInput(addNccKeySchema, await req.json())
    const created = await addNccKey(input)
    return NextResponse.json(
      { ok: true, data: serialize(created) },
      { status: 201 }
    )
  } catch (err) {
    return fail(err, req)
  }
}