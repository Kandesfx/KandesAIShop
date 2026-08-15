import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'
import { RotationSettings } from '@/components/ai/rotation-settings'

export const dynamic = 'force-dynamic'

type RotationApiKey = {
  id: string
  name: string
  rotationPolicy: string
  pinnedNccKeyId: string | null
  pinnedNccKey: {
    id: string
    nickname: string | null
    remainingUsd: number
    totalQuotaUsd: number
  } | null
}

export default async function RotationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/account/api-keys/${id}/rotation`)

  const apiKey = await db.aiApiKey.findUnique({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      rotationPolicy: true,
      pinnedNccKeyId: true,
      pinnedNccKey: {
        select: {
          id: true,
          nickname: true,
          remainingUsd: true,
          totalQuotaUsd: true,
        },
      },
    },
  })

  if (!apiKey) redirect('/account/api-keys')

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <a
            href="/account/api-keys"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to API Keys
          </a>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Rotation Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure how Kandes selects NCC keys for your API requests.
        </p>
      </header>

      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4">
          <p className="text-sm text-gray-500">API Key</p>
          <p className="font-semibold">{apiKey.name}</p>
        </div>

        <div className="border-t pt-4">
          <RotationSettings
            apiKey={{
              id: apiKey.id,
              name: apiKey.name,
              rotationPolicy: apiKey.rotationPolicy as 'auto' | 'pinned',
              pinnedNccKeyId: apiKey.pinnedNccKeyId,
              pinnedNccKey: apiKey.pinnedNccKey
                ? {
                    id: apiKey.pinnedNccKey.id,
                    nickname: apiKey.pinnedNccKey.nickname,
                    remainingUsd: Number(apiKey.pinnedNccKey.remainingUsd),
                    totalQuotaUsd: Number(apiKey.pinnedNccKey.totalQuotaUsd),
                  }
                : null,
            }}
          />
        </div>
      </div>
    </div>
  )
}
