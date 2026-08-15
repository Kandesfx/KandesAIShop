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
      variant="login"
      badge="AUTH · SIGN IN"
      title="Đăng nhập"
      subtitle="Chào mừng quay lại Kandes.shop"
      heroTagline="Mua AI tools"
      heroHighlight="trong 30 giây."
      heroFeatures={[
        { icon: 'zap', label: 'Giao tự động', sub: 'Sản phẩm đến email ngay sau thanh toán' },
        { icon: 'shield', label: 'Bảo hành chính hãng', sub: 'Hoàn tiền 100% nếu gặp sự cố' },
        { icon: 'sparkles', label: 'Hỗ trợ 24/7', sub: 'Telegram & Zalo — phản hồi dưới 5 phút' },
      ]}
      footer={
        <span>
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-electric hover:underline font-medium">
            Đăng ký miễn phí
          </Link>
        </span>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}