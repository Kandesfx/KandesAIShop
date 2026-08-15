import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import ProviderHealthClient from './ProviderHealthClient'

export const dynamic = 'force-dynamic'

export default async function ProviderHealthPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/manage/login?next=/manage/ai/health')
  if (!['admin', 'super_admin'].includes(user.role)) redirect('/')

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <ProviderHealthClient />
    </div>
  )
}
