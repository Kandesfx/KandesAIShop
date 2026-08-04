import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AdminProvidersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin/ai/providers')
  if (!['admin', 'super_admin'].includes(user.role)) redirect('/')

  const configs = await db.aiProviderConfig.findMany({ orderBy: { provider: 'asc' } })

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">AI Providers</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cấu hình upstream provider (Phase 6 chỉ dùng CC Pro qua NCC key pool).
        </p>
      </header>

      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left">
            <tr>
              <th className="p-3">Provider</th>
              <th className="p-3">Base URL</th>
              <th className="p-3 text-right">Monthly Budget</th>
              <th className="p-3 text-right">Spent</th>
              <th className="p-3 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3 font-mono">{c.provider}</td>
                <td className="p-3 text-xs text-gray-600">{c.baseUrl ?? '—'}</td>
                <td className="p-3 text-right font-mono">
                  {c.monthlyBudgetUsd ? `$${Number(c.monthlyBudgetUsd)}` : '—'}
                </td>
                <td className="p-3 text-right font-mono">${Number(c.spentUsd).toFixed(2)}</td>
                <td className="p-3 text-center">{c.isActive ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {configs.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">
            Chưa có provider config. Seed data sẽ thêm sau.
          </p>
        )}
      </div>
    </div>
  )
}