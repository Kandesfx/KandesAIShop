import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rbacGuard } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/usage — full usage analytics (admin).
 * 
 * Query params:
 * - days: 1-365 (default 30)
 * 
 * Returns:
 * - totals: aggregated stats
 * - daily: usage per day
 * - topUsers: top 10 users by tokens
 * - topModels: top 10 models by tokens
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])

    const url = new URL(req.url)
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? 30)))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get daily usage
    const dailyRaw = await db.$queryRaw<{ date: Date; total_tokens: bigint; count: bigint; cost: number }[]>`
      SELECT 
        DATE(createdAt) as date,
        SUM(totalTokens) as total_tokens,
        COUNT(*) as count,
        COALESCE(SUM(upstreamCostUsd), 0) as cost
      FROM AiUsage
      WHERE createdAt >= ${since}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
      LIMIT ${days}
    `

    const daily = dailyRaw.map((d) => ({
      date: d.date.toISOString().split('T')[0],
      tokens: Number(d.total_tokens),
      requests: Number(d.count),
      costUsd: Number(d.cost),
    }))

    // Get top users
    const topUsersRaw = await db.aiUsage.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, upstreamCostUsd: true },
      _count: { _all: true },
      orderBy: { _sum: { totalTokens: 'desc' } },
      take: 10,
    })

    const userIds = topUsersRaw.map((u) => u.userId)
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const topUsers = topUsersRaw.map((u) => ({
      userId: u.userId,
      userName: userMap.get(u.userId)?.name ?? '',
      userEmail: userMap.get(u.userId)?.email ?? u.userId,
      requests: u._count._all,
      tokens: Number(u._sum.totalTokens ?? 0n),
      costUsd: Number(u._sum.upstreamCostUsd ?? 0),
    }))

    // Get top models
    const topModelsRaw = await db.aiUsage.groupBy({
      by: ['model'],
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, upstreamCostUsd: true },
      _count: { _all: true },
      orderBy: { _sum: { totalTokens: 'desc' } },
      take: 10,
    })

    const topModels = topModelsRaw.map((m) => ({
      model: m.model,
      requests: m._count._all,
      tokens: Number(m._sum.totalTokens ?? 0n),
      costUsd: Number(m._sum.upstreamCostUsd ?? 0),
    }))

    // Get totals
    const totalsRaw = await db.aiUsage.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, upstreamCostUsd: true },
      _count: { _all: true },
    })

    const totals = {
      requests: totalsRaw._count._all,
      tokens: Number(totalsRaw._sum.totalTokens ?? 0n),
      costUsd: Number(totalsRaw._sum.upstreamCostUsd ?? 0),
    }

    return ok(
      serialize({
        range: { days, since: since.toISOString() },
        totals,
        daily,
        topUsers,
        topModels,
      })
    )
  } catch (err) {
    return fail(err, req)
  }
}
