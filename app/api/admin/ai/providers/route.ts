import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rbacGuard } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/providers — list AI provider configs.
 * Phase 6 chỉ dùng `ccpro` từ AiNccKey pool, nhưng AiProviderConfig table
 * vẫn còn cho future (D46..D52).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])
    const configs = await db.aiProviderConfig.findMany({ orderBy: { provider: 'asc' } })
    return ok(
      serialize(
        configs.map((c) => ({
          id: c.id,
          provider: c.provider,
          baseUrl: c.baseUrl,
          isActive: c.isActive,
          monthlyBudgetUsd: c.monthlyBudgetUsd ? Number(c.monthlyBudgetUsd) : null,
          spentUsd: Number(c.spentUsd),
          updatedAt: c.updatedAt.toISOString(),
        }))
      )
    )
  } catch (err) {
    return fail(err, req)
  }
}