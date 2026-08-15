import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { userAdminService } from '@/modules/user-admin'
import { UserDetailClient } from '@/components/admin/users/user-detail-client'
import { requireAdminPage } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  await requireAdminPage(`/manage/users/${id}`)

  const [user, currentUser] = await Promise.all([
    userAdminService.getUserDetail(id),
    getCurrentUser(),
  ])

  return (
    <div className="container-narrow py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-ink-200">
        <Link href="/manage/users" className="hover:text-electric">
          Người dùng
        </Link>
        <span>/</span>
        <span className="text-ink-50">{user.name}</span>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / USERS / DETAIL ]
        </span>
        <h1 className="text-display-lg font-display">
          Chi tiết người dùng
          <span className="text-electric">.</span>
        </h1>
      </div>

      {/* User Detail */}
      {currentUser && (
        <UserDetailClient
          user={user}
          currentAdminId={currentUser.id}
          currentAdminRole={currentUser.role}
        />
      )}
    </div>
  )
}
