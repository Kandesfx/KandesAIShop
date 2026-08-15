import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LoginOtpForm } from '@/components/auth/login-otp-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const dynamic = 'force-dynamic'

export default async function LoginOtpPage() {
  const user = await getCurrentUser()
  if (user) redirect('/account')

  return (
    <AuthShell
      title="Đăng nhập bằng OTP"
      subtitle="Nhận mã 6 số qua email để đăng nhập không cần mật khẩu"
      badge="AUTH · OTP LOGIN"
      footer={
        <span>
          Muốn dùng mật khẩu?{' '}
          <Link href="/login" className="text-electric hover:underline">
            Đăng nhập thường
          </Link>
        </span>
      }
    >
      <LoginOtpForm />
    </AuthShell>
  )
}
