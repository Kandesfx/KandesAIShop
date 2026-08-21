import { getCurrentUser } from '@/lib/auth'
import { ProfileForm } from '@/components/account/profile-form'
import { Card } from '@/components/ui/card'
import { User, ShieldCheck, Mail, Calendar, Phone } from 'lucide-react'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tài khoản của tôi · Kandes',
  description: 'Quản lý thông tin cá nhân và tài khoản Kandes Shop',
}

export default async function AccountPage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }
  if (!user) return null

  const initials = user.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : (user.email?.[0] ?? '?').toUpperCase()

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A'

  return (
    <div className="space-y-6">
      {/* Header Profile Overview */}
      <div className="border border-ink-700/80 bg-ink-900/90 p-6 rounded-lg shadow-lg relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-electric/10 via-plasma/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
          {/* Avatar */}
          <div className="relative">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name || 'Avatar'}
                width={72}
                height={72}
                className="w-18 h-18 rounded-full object-cover border-2 border-electric shadow-[0_0_16px_rgba(0,229,255,0.4)]"
                unoptimized
              />
            ) : (
              <div className="w-18 h-18 rounded-full bg-electric/15 border-2 border-electric/60 text-electric flex items-center justify-center text-xl font-bold font-display shadow-[0_0_16px_rgba(0,229,255,0.3)]">
                {initials}
              </div>
            )}
            <span
              className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-400 border-2 border-ink-900 rounded-full"
              title="Đang hoạt động"
            />
          </div>

          {/* User Details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide truncate">
                {user.name || 'Người dùng Kandes'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-electric/10 text-electric border border-electric/30">
                <ShieldCheck size={11} />
                {user.role === 'super_admin' ? 'Super Admin' : 'Khách hàng'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[13px] text-ink-100 font-mono">
              <span className="inline-flex items-center gap-1.5 text-ink-100">
                <Mail size={12} className="text-electric" />
                {user.email}
              </span>
              {user.phone && (
                <span className="inline-flex items-center gap-1.5 text-ink-100">
                  <Phone size={12} className="text-plasma" />
                  {user.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-ink-400">
                <Calendar size={12} />
                Tham gia: {memberSince}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <Card className="p-6 border-ink-700/80 bg-ink-900/80">
        <div className="mb-5 pb-3 border-b border-ink-700/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-semibold text-white flex items-center gap-2">
              <User size={16} className="text-electric" />
              Thông tin cá nhân
            </h2>
            <p className="text-[13px] text-ink-100 mt-0.5">
              Cập nhật họ tên, số điện thoại và ảnh đại diện
            </p>
          </div>
        </div>

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
