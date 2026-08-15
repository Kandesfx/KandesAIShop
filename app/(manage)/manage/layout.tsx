import { getCurrentUser } from '@/lib/auth'
import { AdminShell } from '@/components/layout/admin-shell'

/**
 * Admin layout — UI shell (sidebar + main content).
 * Auth guard đã được check ở (manage)/layout.tsx (route group).
 *
 * Path: app/(manage)/manage/layout.tsx
 * Group (manage) ngăn root layout render Header/Footer cho các trang admin.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // Auth guard đã lo redirect
  }

  const userBadge = user ? (
    <span className="inline-block tech-tag">
      <span>ADMIN · {user.role.toUpperCase()}</span>
    </span>
  ) : null

  return <AdminShell userBadge={userBadge}>{children}</AdminShell>
}
