import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

export default async function AdminPlansPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/manage/login?next=/manage/ai/plans')
  if (!['admin', 'super_admin'].includes(user.role)) {
    redirect('/')
  }

  const plans = await db.aiPlan.findMany({ orderBy: { priceCents: 'asc' } })

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">AI Plans</h1>
        <p className="mt-1 text-sm text-ink-200">Quản lý các gói AI bán cho KH.</p>
      </header>

      <div className="rounded border bg-ink-800">
        <table className="w-full text-sm">
          <thead className="border-b bg-ink-900 text-left">
            <tr>
              <th className="p-3">Slug</th>
              <th className="p-3">Name</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-right">Quota</th>
              <th className="p-3 text-right">Rate/min</th>
              <th className="p-3 text-right">Soft cap</th>
              <th className="p-3 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-mono text-xs">{p.slug}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-right font-mono">
                  {(Number(p.priceCents) / 100).toLocaleString('vi-VN')} VND
                </td>
                <td className="p-3 text-right font-mono">
                  {p.quotaTokens.toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono">{p.rateLimitPerMinute}</td>
                <td className="p-3 text-right font-mono">
                  {p.softCapTokens?.toLocaleString() ?? '—'}
                </td>
                <td className="p-3 text-center">{p.isActive ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {plans.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-300">
            Chưa có plan. Chạy <code>npm run prisma:seed</code>.
          </p>
        )}
      </div>

      <p className="text-xs text-ink-300">
        Edit plans dùng SQL / Prisma Studio Phase 6. UI edit (P6-07 PATCH) cho Phase 7+.
      </p>
    </div>
  )
}