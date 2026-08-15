import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'
import { RotationStats } from '@/components/admin/ai/rotation-stats'
import { UserUsageLimits } from '@/components/admin/ai/user-usage-limits'

export const dynamic = 'force-dynamic'

type RotationStatsData = {
  totalApiKeys: number
  autoRotation: number
  pinnedKeys: number
  byUser: {
    userId: string
    userEmail: string
    userName: string | null
    apiKeyCount: number
    pinnedCount: number
  }[]
}

type UserUsageData = {
  userId: string
  userEmail: string
  userName: string | null
  apiKeyCount: number
  totalTokens: number
  totalCost: number
  lastUsedAt: string | null
}[]

async function getRotationStats(): Promise<RotationStatsData> {
  const apiKeys = await db.aiApiKey.groupBy({
    by: ['userId'],
    _count: { _all: true },
  })

  const autoRotation = await db.aiApiKey.count({
    where: { rotationPolicy: 'auto' },
  })

  const pinnedKeys = await db.aiApiKey.count({
    where: { rotationPolicy: 'pinned' },
  })

  const userIds = apiKeys.map((k) => k.userId)
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  const pinnedByUser = await db.aiApiKey.groupBy({
    by: ['userId'],
    where: { rotationPolicy: 'pinned' },
    _count: { _all: true },
  })
  const pinnedMap = new Map(pinnedByUser.map((p) => [p.userId, p._count._all]))

  const byUser = apiKeys.map((k) => {
    const user = userMap.get(k.userId)
    return {
      userId: k.userId,
      userEmail: user?.email ?? k.userId,
      userName: user?.name ?? null,
      apiKeyCount: k._count._all,
      pinnedCount: pinnedMap.get(k.userId) ?? 0,
    }
  })

  return {
    totalApiKeys: apiKeys.reduce((sum, k) => sum + k._count._all, 0),
    autoRotation,
    pinnedKeys,
    byUser,
  }
}

async function getUserUsage(): Promise<UserUsageData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const usage = await db.aiUsage.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _sum: { totalTokens: true, upstreamCostUsd: true },
    _count: { _all: true },
    _max: { createdAt: true },
  })

  const apiKeyCounts = await db.aiApiKey.groupBy({
    by: ['userId'],
    _count: { _all: true },
  })
  const apiKeyCountMap = new Map(apiKeyCounts.map((k) => [k.userId, k._count._all]))

  const userIds = usage.map((u) => u.userId)
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  return usage.map((u) => {
    const user = userMap.get(u.userId)
    return {
      userId: u.userId,
      userEmail: user?.email ?? u.userId,
      userName: user?.name ?? null,
      apiKeyCount: apiKeyCountMap.get(u.userId) ?? 0,
      totalTokens: Number(u._sum.totalTokens ?? 0n),
      totalCost: Number(u._sum.upstreamCostUsd ?? 0),
      lastUsedAt: u._max.createdAt?.toISOString() ?? null,
    }
  })
}

export default async function AdminAISettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/manage/login?next=/manage/ai/settings')
  if (!['admin', 'super_admin'].includes(user.role)) redirect('/')

  const [rotationStats, userUsage] = await Promise.all([
    getRotationStats(),
    getUserUsage(),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-50">AI Settings</h1>
        <p className="text-sm text-ink-300 mt-1">
          Manage AI gateway settings and monitor usage.
        </p>
      </div>

      <section>
        <RotationStats stats={serialize(rotationStats)} />
      </section>

      <section>
        <UserUsageLimits users={serialize(userUsage)} />
      </section>
    </div>
  )
}
