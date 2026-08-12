import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { SESSION_COOKIES } from '@/modules/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Route group layout — (admin).
 * Wrap tất cả trang admin, KHÔNG render Header/Footer của root layout.
 *
 * Auth guard đã được xử lý ở middleware.ts (D78):
 *   - Middleware check cookie `kds_access` tồn tại → nếu thiếu → HTTP 307
 *     redirect về `/admin/login?next=<original>` TRƯỚC khi vào layout.
 *   - Path `/admin/login` không bị guard.
 *
 * Layout này chỉ làm phần việc còn lại:
 *   - Verify JWT thật sự hợp lệ (cookie có thể giả mạo/hết hạn → page-level check fail)
 *   - Nếu invalid → redirect /admin/login (defense-in-depth).
 *   - KHÔNG dựa vào header `x-pathname` vì Next.js standalone không reliably
 *     forward middleware-modified headers tới Server Component `headers()` API
 *     (xem git log: f5870d9 / loop root cause analysis).
 */
export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  // Page `/admin/login` không cần auth — middleware đã skip path này.
  // Không cần kiểm tra pathname ở đây nữa (xem comment trên).
  // Nếu cookie tồn tại → middleware đã cho qua → verify token thật.
  if (cookieStore.has(SESSION_COOKIES.access)) {
    try {
      const user = await getCurrentUser()
      if (user) return <>{children}</>
    } catch {
      // Fall through: invalid token → redirect.
    }
  }

  redirect('/admin/login')
}
