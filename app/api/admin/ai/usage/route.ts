import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rbacGuard } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/usage — top users + top models + total cost (admin).
 *
 * Phase 6 simple aggregate — Phase 7+ có thể move sang rollup table.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])

    const url = new URL(req.url)
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? 30)))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [topUsersRaw, topModelsRaw, totals] = await Promise.all([
      db.aiUsage.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _sum: { totalTokens: true, upstreamCostUsd: true },
        _count: { _all: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
        take: 10,
      }),
      db.aiUsage.groupBy({
        by: ['model'],
        where: { createdAt: { gte: since } },
        _sum: { totalTokens: true, upstreamCostUsd: true },
        _count: { _all: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
        take: 10,
      }),
      db.aiUsage.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { totalTokens: true, upstreamCostUsd: true },
        _count: { _all: true },
      }),
    ])

    // Resolve user names
    const userIds = topUsersRaw.map((u) => u.userId)
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    return ok(
      serialize({
        range: { days, since: since.toISOString() },
        totals: {
          requests: totals._count._all,
          totalTokens: Number(totals._sum.totalTokens ?? 0n),
          upstreamCostUsd: totals._sum.upstreamCostUsd ? Number(totals._sum.upstreamCostUsd) : 0,
        },
        topUsers: topUsersRaw.map((u) => ({
          user: userMap.get(u.userId)
            ? {
                id: userMap.get(u.userId)!.id,
                email: userMap.get(u.userId)!.email,
                name: userMap.get(u.userId)!.name,
              }
            : { id: u.userId, email: null, name: null },
          requests: u._count._all,
          totalTokens: Number(u._sum.totalTokens ?? 0n),
          upstreamCostUsd: u._sum.upstreamCostUsd ? Number(u._sum.upstreamCostUsd) : 0,
        })),
        topModels: topModelsRaw.map((m) => ({
          model: m.model,
          requests: m._count._all,
          totalTokens: Number(m._sum.totalTokens ?? 0n),
          upstreamCostUsd: m._sum.upstreamCostUsd ? Number(m._sum.upstreamCostUsd) : 0,
        })),
      })
    )
  } catch (err) {
    return fail(err, req)
  }
}