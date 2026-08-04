import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import UsageClient from './UsageClient'

export const dynamic = 'force-dynamic'

export default async function UsagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/account/api-keys/${id}/usage`)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">API Key Usage</h1>
      </header>
      <UsageClient apiKeyId={id} />
    </div>
  )
}