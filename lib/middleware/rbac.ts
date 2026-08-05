import type { UserRole } from '@prisma/client'

/**
 * Role-based access control helpers.
 *
 * Cách dùng:
 *   if (!can(user, 'product:write')) throw new ForbiddenError()
 *
 * Resource:Action dạng 'resource:action'.
 * Mapping permission → roles nằm dưới đây, dễ sửa khi cần.
 *
 * Phase 2 chỉ cần 3 quyền cơ bản cho catalog/admin, mở rộng sau.
 */

export type Permission =
  // Catalog
  | 'product:read'
  | 'product:write'
  | 'category:read'
  | 'category:write'
  // Orders (Phase 2)
  | 'order:read'
  | 'order:write'
  // Users (Phase 2)
  | 'user:read'
  | 'user:write'
  // Settings (Phase 3)
  | 'setting:write'
  // Audit (Phase 3)
  | 'audit:read'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  customer: [],
  staff: [
    'product:read',
    'product:write',
    'category:read',
    'category:write',
    'order:read',
    'order:write',
  ],
  admin: [
    'product:read',
    'product:write',
    'category:read',
    'category:write',
    'order:read',
    'order:write',
    'user:read',
    'user:write',
    'setting:write',
    'audit:read',
  ],
  super_admin: [
    'product:read',
    'product:write',
    'category:read',
    'category:write',
    'order:read',
    'order:write',
    'user:read',
    'user:write',
    'setting:write',
    'audit:read',
  ],
}

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/** Throw ForbiddenError nếu user không có quyền */
export function requirePermission(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error(`Role '${role}' không có quyền '${permission}'`)
  }
}
