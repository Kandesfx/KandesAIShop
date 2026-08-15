import Link from 'next/link'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Đặt lại mật khẩu"
      subtitle="Nhập mật khẩu mới cho tài khoản của bạn"
      badge="AUTH · NEW PASSWORD"
      footer={
        <Link href="/login" className="text-electric hover:underline">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      <Suspense fallback={<div className="text-body-sm text-ink-200">Đang tải...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
