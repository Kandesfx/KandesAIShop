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
  if (!user) redirect('/manage/login?next=/manage/ai/ncc-keys')
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
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-50">NCC Key Pool</h1>
          <p className="mt-1 text-sm text-ink-200">
            Pool NCC API keys dùng để forward cho KH. KHÔNG share API key plaintext ra ngoài.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/manage/ai/ncc-keys/import"
            className="inline-flex items-center gap-2 rounded border border-ink-400 bg-ink-800 px-4 py-2 text-sm font-medium text-ink-100 hover:bg-ink-900"
          >
            📥 Export/Import
          </a>
        </div>
      </header>
      <NccKeysClient initialKeys={serialize(clientItems)} />
    </div>
  )
}
