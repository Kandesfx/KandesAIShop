import { getCurrentUser } from '@/lib/auth'
import { ProfileForm } from '@/components/account/profile-form'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }
  if (!user) return null // Layout đã redirect

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-display-lg font-display">Hồ sơ</h1>
        <p className="text-body-sm text-ink-200 mt-1">Quản lý thông tin cá nhân của bạn</p>
      </header>

      <Card className="p-6">
        <ProfileForm
          initial={{
            name: user.name ?? '',
            phone: user.phone ?? '',
            avatarUrl: user.avatarUrl ?? '',
          }}
        />
      </Card>
    </div>
  )
}
