import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

/**
 * Route group layout — (admin).
 * Wrap tất cả trang admin, KHÔNG render Header/Footer của root layout.
 * Auth guard tập trung: trừ /admin/login, các trang khác bắt buộc đăng nhập.
 * Login page tự check auth và redirect về /admin nếu đã login.
 */
export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }
  if (!user) redirect('/admin/login')
  return <>{children}</>
}
