/**
 * User admin service — P4-02.
 *
 * Các hàm admin quản lý user:
 * - List users với search, filter
 * - Chi tiết user
 * - Khoá/mở khoá tài khoản
 * - Impersonate (đăng nhập thay)
 */

import { db } from '@/lib/db'
import { NotFoundError, ConflictError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// Kiểu dữ liệu trả về
export interface UserAdmin {
  id: string
  email: string | null
  phone: string | null
  name: string | null
  avatarUrl: string | null
  role: string
  status: string
  emailVerifiedAt: string | null
  createdAt: string
  lastLoginAt: string | null
}

export interface UserListResult {
  users: UserAdmin[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface UserDetail extends UserAdmin {
  ordersCount: number
  totalSpentCents: number
  reviewsCount: number
  metadata: Record<string, unknown>
}

// List users với search + filter
export async function listUsers(
  page: number,
  limit: number,
  search?: string,
  role?: string,
  status?: string
): Promise<UserListResult> {
  const skip = (page - 1) * limit

  // Build where clause
  const where: Record<string, unknown> = {
    deletedAt: null,
  }

  if (role && role !== 'all') {
    where.role = role
  }

  if (status && status !== 'all') {
    where.status = status
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
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
    db.user.count({ where }),
  ])

  return {
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
    page,
    limit,
    total,
    hasMore: page * limit < total,
  }
}

// Chi tiết 1 user
export async function getUserDetail(userId: string): Promise<UserDetail> {
  const user = await db.user.findUnique({
    where: { id: userId, deletedAt: null },
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
      metadata: true,
    },
  })

  if (!user) {
    throw new NotFoundError('Không tìm thấy người dùng')
  }

  // Lấy thêm stats
  const [ordersStats, reviewsCount] = await Promise.all([
    db.order.aggregate({
      where: { userId, status: { in: ['completed', 'delivered'] } },
      _count: true,
      _sum: { totalCents: true },
    }),
    db.review.count({ where: { userId, deletedAt: null } }),
  ])

  return {
    id: user.id,
    email: user.email ?? '',
    phone: user.phone,
    name: user.name ?? 'Không tên',
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    ordersCount: ordersStats._count,
    totalSpentCents: Number(ordersStats._sum.totalCents ?? 0),
    reviewsCount,
    metadata: (user.metadata as Record<string, unknown>) ?? {},
  }
}

// Khoá/mở khoá user
export async function setUserStatus(
  userId: string,
  adminId: string,
  newStatus: 'active' | 'locked'
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, role: true },
  })

  if (!user) {
    throw new NotFoundError('Không tìm thấy người dùng')
  }

  // Không cho khoá admin
  if (user.role === 'super_admin') {
    throw new ConflictError('Không thể khoá tài khoản super admin')
  }

  // Không cho tự khoá chính mình
  if (userId === adminId) {
    throw new ConflictError('Không thể tự khoá tài khoản của mình')
  }

  await db.user.update({
    where: { id: userId },
    data: { status: newStatus },
  })

  logger.info({ userId, adminId, newStatus }, 'User status changed')
}

// Impersonate - tạo session đặc biệt để đăng nhập thay user
export async function impersonateUser(
  targetUserId: string,
  adminId: string,
  ip?: string
): Promise<{ impersonationToken: string }> {
  const target = await db.user.findUnique({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true, status: true, role: true },
  })

  if (!target) {
    throw new NotFoundError('Không tìm thấy người dùng')
  }

  if (target.status !== 'active') {
    throw new ConflictError('Tài khoản không hoạt động')
  }

  // Tạo impersonation token (đơn giản: base64 encode)
  // Trong production nên dùng JWT hoặc signed token
  const payload = {
    sub: targetUserId,
    admin: adminId,
    type: 'impersonation',
    exp: Date.now() + 30 * 60 * 1000, // 30 phút
  }
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url')

  // Ghi audit log
  await db.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: 'user.impersonate',
      resourceType: 'user',
      resourceId: targetUserId,
      ipAddress: ip ?? null,
      payload: { targetUserId },
    },
  })

  logger.info({ targetUserId, adminId }, 'User impersonation started')

  return { impersonationToken: token }
}

export const userAdminService = {
  listUsers,
  getUserDetail,
  setUserStatus,
  impersonateUser,
}
