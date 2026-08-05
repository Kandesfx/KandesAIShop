import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { RegisterForm } from '@/components/auth/register-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }
  if (user) redirect('/account')

  return (
    <AuthShell
      title="Đăng ký"
      subtitle="Tạo tài khoản để mua hàng và theo dõi đơn"
      badge="AUTH · SIGN UP"
      footer={
        <span>
          Đã có tài khoản?{' '}
          <Link href="/auth/login" className="text-electric hover:underline">
            Đăng nhập
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
