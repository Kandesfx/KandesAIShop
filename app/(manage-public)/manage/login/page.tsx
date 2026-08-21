import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LoginForm } from '@/components/admin/login-form'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  const user = await getCurrentUser()
    if (user) redirect('/manage')

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-electric/10 border border-electric/30 mb-4">
            <svg
              className="w-6 h-6 text-electric"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-display font-semibold text-ink-50 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-[12px] font-mono text-ink-300 mt-1 uppercase tracking-widest">
            Kandes AI Shop
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Back to store link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-[12px] font-mono text-ink-400 hover:text-electric transition-colors"
          >
            ← Quay về cửa hàng
          </a>
        </div>
      </div>
    </div>
  )
}
