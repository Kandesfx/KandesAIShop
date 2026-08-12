import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LoginForm } from '@/components/admin/login-form'
import { Logo } from '@/components/brand/logo'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  const user = await getCurrentUser()
  if (user) redirect('/admin')

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center space-y-3 mb-8">
          <Logo variant="full" size={36} />
          <span className="inline-block tech-tag">
            <span>ADMIN · SECURE LOGIN</span>
          </span>
          <p className="text-[12px] font-mono text-ink-200 mt-2">
            [ AUTH / STAFF & ADMIN ONLY ]
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
