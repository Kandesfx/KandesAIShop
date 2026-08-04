import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { serialize } from '@/lib/serialize'
import { db } from '@/lib/db'
import ApiKeysClient from './ApiKeysClient'

export const dynamic = 'force-dynamic'

export default async function ApiKeysPage() {
  // Get current user via cookie session
  const { getCurrentUser } = await import('@/lib/auth')
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/account/api-keys')
  }

  const keys = await db.aiApiKey.findMany({
    where: { userId: user.id },
    include: { plan: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tạo API key để dùng Claude Code, Codex, OpenAI client qua Kandes.shop.
        </p>
      </header>
      <ApiKeysClient
        initialKeys={serialize(
          keys.map((k) => ({
            id: k.id,
            name: k.name,
            keyMasked: `ks-${k.keyPrefix.slice(3, 8)}****`,
            plan: { name: k.plan.name, slug: k.plan.slug },
            status: k.status,
            source: k.source,
            quotaUsedTokens: k.quotaUsedTokens.toString(),
            lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
            expiresAt: k.expiresAt?.toISOString() ?? null,
            createdAt: k.createdAt.toISOString(),
          }))
        )}
      />
    </div>
  )
}