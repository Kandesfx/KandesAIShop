import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import BalanceClient from './BalanceClient'

export const dynamic = 'force-dynamic'

export default async function BalancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/account/api-keys/${id}/balance`)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">API Key Balance</h1>
        <p className="mt-1 text-sm text-gray-600">
          Hạn mứ NCC key và danh sách models có sẵn (fetch real-time từ nhà cung cấp).
        </p>
      </header>
      <BalanceClient apiKeyId={id} />
    </div>
  )
}