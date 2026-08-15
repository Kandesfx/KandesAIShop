import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { SESSION_COOKIES } from '@/modules/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Route group layout — (admin).
 * Wrap tất cả trang admin, KHÔNG render Header/Footer của root layout.
 *
 * Auth guard chạy ở 2 tầng (D78b):
 *   1. middleware.ts: HTTP 307 redirect nếu /manage/* không có kds_access cookie.
 *      Áp dụng cho mọi /manage/* TRỪ /manage/login (login không cần auth).
 *   2. Layout này (defense-in-depth): verify JWT thật + redirect khi invalid.
 *
 * Lưu ý cấu trúc:
 *   - `/manage/login` được tách sang route group `(admin-public)` để KHÔNG bị
 *     áp dụng layout này. Mọi file `app/(admin)/manage/**` đều nằm dưới guard
 *     này và có cookie hợp lệ mới render được.
 *
 *   - Trước đó (D78) layout này cố detect pathname qua header `x-pathname` để
 *     skip auth cho /manage/login. Cách đó không hoạt động trong Next.js 14.2.18
 *     standalone output vì middleware-modified headers không propagate tới
 *     `headers()` API trong Server Components → meta-refresh loop. Cách mới
 *     (tách route group) triệt để hơn, không phụ thuộc header propagation.
 */
export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  if (cookieStore.has(SESSION_COOKIES.access)) {
    try {
      const user = await getCurrentUser()
      if (user) return <>{children}</>
    } catch {
      // Fall through: invalid token → redirect.
    }
  }

  redirect('/manage/login')
}
