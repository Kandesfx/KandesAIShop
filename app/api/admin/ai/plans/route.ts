import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rbacGuard } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/plans — list AI plans (admin view).
 *
 * Permission: admin / super_admin (D26 — staff chỉ xem qua service khác).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])
    const plans = await db.aiPlan.findMany({ orderBy: { priceCents: 'asc' } })
    return ok(
      serialize(
        plans.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          priceCents: p.priceCents.toString(),
          durationDays: p.durationDays,
          quotaTokens: p.quotaTokens.toString(),
          rateLimitPerMinute: p.rateLimitPerMinute,
          softCapTokens: p.softCapTokens?.toString() ?? null,
          isActive: p.isActive,
          createdAt: p.createdAt.toISOString(),
        }))
      )
    )
  } catch (err) {
    return fail(err, req)
  }
}