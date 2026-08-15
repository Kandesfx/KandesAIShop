import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AccountSidebar } from '@/components/account/account-sidebar'

export const dynamic = 'force-dynamic'

/**
 * Layout cho customer area (/account/*). Yêu cầu auth.
 * Sidebar là client component (AccountSidebar) để có active route highlight.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }
  if (!user) redirect('/login?next=/account')

  return (
    <div className="min-h-screen bg-ink-900">
      <div className="container-wide py-8">
        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          <AccountSidebar
            user={{ name: user.name ?? null, email: user.email ?? '' }}
          />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}