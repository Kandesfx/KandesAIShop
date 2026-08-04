import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AdminUsagePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin/ai/usage')
  if (!['admin', 'super_admin'].includes(user.role)) redirect('/')

  const days = 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [topUsers, topModels, totals] = await Promise.all([
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

  const users = await db.user.findMany({
    where: { id: { in: topUsers.map((u) => u.userId) } },
    select: { id: true, email: true, name: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">AI Usage Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          30 ngày gần nhất. Top users / models / total cost.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-600">Total requests</p>
          <p className="text-2xl font-bold">{totals._count._all.toLocaleString()}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-600">Total tokens</p>
          <p className="text-2xl font-bold">
            {Number(totals._sum.totalTokens ?? 0n).toLocaleString()}
          </p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-600">Total upstream cost (USD)</p>
          <p className="text-2xl font-bold">
            ${totals._sum.upstreamCostUsd ? Number(totals._sum.upstreamCostUsd).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      <div className="rounded border bg-white">
        <h2 className="border-b p-3 text-base font-semibold">Top users</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3 text-right">Requests</th>
              <th className="p-3 text-right">Tokens</th>
              <th className="p-3 text-right">Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.map((u) => {
              const user = userMap.get(u.userId)
              return (
                <tr key={u.userId} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{user?.name ?? '—'}</div>
                    <div className="text-xs text-gray-500">{user?.email ?? u.userId}</div>
                  </td>
                  <td className="p-3 text-right font-mono">{u._count._all}</td>
                  <td className="p-3 text-right font-mono">
                    {Number(u._sum.totalTokens ?? 0n).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono">
                    ${u._sum.upstreamCostUsd ? Number(u._sum.upstreamCostUsd).toFixed(2) : '0.00'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {topUsers.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">Chưa có usage.</p>
        )}
      </div>

      <div className="rounded border bg-white">
        <h2 className="border-b p-3 text-base font-semibold">Top models</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Model</th>
              <th className="p-3 text-right">Requests</th>
              <th className="p-3 text-right">Tokens</th>
              <th className="p-3 text-right">Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            {topModels.map((m) => (
              <tr key={m.model} className="border-b last:border-0">
                <td className="p-3 font-mono">{m.model}</td>
                <td className="p-3 text-right font-mono">{m._count._all}</td>
                <td className="p-3 text-right font-mono">
                  {Number(m._sum.totalTokens ?? 0n).toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono">
                  ${m._sum.upstreamCostUsd ? Number(m._sum.upstreamCostUsd).toFixed(2) : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {topModels.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">Chưa có usage.</p>
        )}
      </div>
    </div>
  )
}