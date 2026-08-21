import { getCurrentUser } from '@/lib/auth'
import { ChangePasswordForm } from '@/components/account/change-password-form'
import { LogoutAllButton } from '@/components/account/logout-all-button'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-display-lg font-display">Cài đặt</h1>
        <p className="text-body-sm text-ink-100 mt-1">Bảo mật và phiên đăng nhập</p>
      </header>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-body-lg font-display">Đổi mật khẩu</h2>
          <p className="text-body-sm text-ink-100 mt-1">
            Nên dùng mật khẩu mạnh (ít nhất 8 ký tự, có chữ và số)
          </p>
        </div>
        <ChangePasswordForm />
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-body-lg font-display">Phiên đăng nhập</h2>
          <p className="text-body-sm text-ink-100 mt-1">
            Đăng xuất khỏi tất cả thiết bị. Các session hiện tại sẽ bị thu hồi ngay lập tức.
          </p>
        </div>
        <LogoutAllButton />
      </Card>

      <Card className="p-6 space-y-2">
        <h2 className="text-body-lg font-display">Thông tin tài khoản</h2>
        <dl className="text-body-sm space-y-1.5 mt-2">
          <div className="flex justify-between">
            <dt className="text-ink-100">Email:</dt>
            <dd className="font-mono">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-100">Vai trò:</dt>
            <dd className="font-mono">{user.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-100">Ngày tạo:</dt>
            <dd className="font-mono">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
