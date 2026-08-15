import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'

/**
 * Server-component guard — redirect về /login nếu user không đủ role.
 *
 * Use case: page server components mà cần admin/super_admin/staff role.
 * Redirect về /login?next=<current> nếu không pass.
 *
 * @example
 *   // app/(manage)/manage/users/page.tsx
 *   export default async function Page() {
 *     const user = await requireAdminPage()
 *     // ... user chắc chắn có role admin|staff|super_admin
 *   }
 */
export async function requireAdminPage(redirectTo?: string) {
  try {
    return await requireRole('staff', 'admin', 'super_admin')
  } catch {
    const next = redirectTo ?? '/manage'
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }
}

export async function requireSuperAdminPage(redirectTo?: string) {
  try {
    return await requireRole('super_admin')
  } catch {
    const next = redirectTo ?? '/manage'
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }
}
