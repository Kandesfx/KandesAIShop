import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { RegisterOtpForm } from '@/components/auth/register-otp-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const dynamic = 'force-dynamic'

export default async function RegisterOtpPage() {
  const user = await getCurrentUser()
  if (user) redirect('/account')

  return (
    <AuthShell
      title="Đăng ký bằng OTP"
      subtitle="Tạo tài khoản không cần mật khẩu — chỉ cần email"
      badge="AUTH · OTP SIGN UP"
      footer={
        <span>
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-electric hover:underline">
            Đăng nhập
          </Link>
        </span>
      }
    >
      <RegisterOtpForm />
    </AuthShell>
  )
}
