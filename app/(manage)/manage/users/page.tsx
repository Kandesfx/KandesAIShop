import { db } from '@/lib/db'
import { UsersList } from '@/components/admin/users/users-list'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  // Lấy initial data
  const [users, total] = await Promise.all([
    db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    db.user.count({ where: { deletedAt: null } }),
  ])

  const initialData = {
    users: users.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      phone: u.phone,
      name: u.name ?? 'Không tên',
      avatarUrl: u.avatarUrl,
      role: u.role,
      status: u.status,
      emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
    page: 1,
    total,
    hasMore: total > 20,
  }

  return (
    <div className="container-narrow py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / USERS ]
        </span>
        <h1 className="text-display-lg font-display">
          Người dùng
          <span className="text-electric">.</span>
        </h1>
      </div>

      {/* Users List */}
      <UsersList initialData={initialData} />
    </div>
  )
}
