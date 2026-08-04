import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listNccKeys } from '@/modules/ai-gateway/ncc-keys'
import { serialize } from '@/lib/serialize'
import NccKeysClient from './NccKeysClient'

export const dynamic = 'force-dynamic'

type NccKeyClientShape = {
  id: string
  provider: string
  totalQuotaUsd: number
  remainingUsd: number
  nickname: string | null
  status: 'active' | 'low_balance' | 'exhausted' | 'disabled'
  lastSyncedAt: string | null
  createdAt: string
}

export default async function AdminNccKeysPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin/ai/ncc-keys')
  if (!['admin', 'super_admin'].includes(user.role)) redirect('/')

  const { items } = await listNccKeys({ page: 1, pageSize: 100 })

  const clientItems: NccKeyClientShape[] = items.map((k) => ({
    id: k.id,
    provider: k.provider,
    totalQuotaUsd: k.totalQuotaUsd,
    remainingUsd: k.remainingUsd,
    nickname: k.nickname,
    status: k.status,
    lastSyncedAt: k.lastSyncedAt ? k.lastSyncedAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">NCC Key Pool</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pool NCC API keys dùng để forward cho KH. KHÔNG share API key plaintext ra ngoài.
        </p>
      </header>
      <NccKeysClient initialKeys={serialize(clientItems)} />
    </div>
  )
}