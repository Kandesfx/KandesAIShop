import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'
import AdminUsageClient from './AdminUsageClient'

export const dynamic = 'force-dynamic'

type DailyUsage = {
  date: string
  tokens: number
  requests: number
  costUsd: number
}

type TopUser = {
  userId: string
  userName: string
  userEmail: string
  requests: number
  tokens: number
  costUsd: number
}

type TopModel = {
  model: string
  requests: number
  tokens: number
  costUsd: number
}

type UsageData = {
  totals: {
    requests: number
    tokens: number
    costUsd: number
  }
  daily: DailyUsage[]
  topUsers: TopUser[]
  topModels: TopModel[]
}

async function getUsageData(days: number): Promise<UsageData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Get daily usage for the past N days
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

  const daily: DailyUsage[] = dailyRaw.map((d) => ({
    date: d.date.toISOString().split('T')[0] ?? '',
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

  const topUsers: TopUser[] = topUsersRaw.map((u) => ({
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

  const topModels: TopModel[] = topModelsRaw.map((m) => ({
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

  return { totals, daily, topUsers, topModels }
}

export default async function AdminUsagePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/manage/login?next=/manage/ai/usage')
  if (!['admin', 'super_admin'].includes(user.role)) redirect('/')

  const initialData = await getUsageData(30)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <AdminUsageClient initialData={serialize(initialData)} />
    </div>
  )
}
