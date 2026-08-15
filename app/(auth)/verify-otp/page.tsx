import Link from 'next/link'
import { Suspense } from 'react'
import { OtpVerifyForm } from '@/components/auth/otp-verify-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const dynamic = 'force-dynamic'

export default function VerifyOtpPage() {
  return (
    <AuthShell
      title="Nhập mã OTP"
      subtitle="Mã 6 số đã được gửi tới email của bạn"
      badge="AUTH · OTP"
      footer={
        <Link href="/login" className="text-electric hover:underline">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      <Suspense fallback={<div className="text-body-sm text-ink-200">Đang tải...</div>}>
        <OtpVerifyForm />
      </Suspense>
    </AuthShell>
  )
}
