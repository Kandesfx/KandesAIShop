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
      variant="register"
      badge="AUTH · SIGN UP"
      title="Tạo tài khoản"
      subtitle="Đăng ký để mua hàng và theo dõi đơn dễ dàng"
      heroTagline="Bắt đầu"
      heroHighlight="ngay hôm nay."
      heroFeatures={[
        { icon: 'sparkles', label: 'Tích điểm đổi quà', sub: 'Mỗi đơn hàng đều tích lũy điểm thưởng' },
        { icon: 'zap', label: 'Thanh toán nhanh', sub: 'Lưu thông tin — checkout chỉ trong 1 click' },
        { icon: 'shield', label: 'Bảo mật tài khoản', sub: 'Mã hóa 2 lớp + xác thực email' },
      ]}
      footer={
        <span>
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-electric hover:underline font-medium">
            Đăng nhập
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}