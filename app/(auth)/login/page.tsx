import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { LoginForm } from '@/components/auth/login-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }
  if (user) redirect('/account')

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Chào mừng quay lại Kandes.shop"
      badge="AUTH · SIGN IN"
      footer={
        <span>
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" className="text-electric hover:underline">
            Đăng ký
          </Link>
        </span>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
