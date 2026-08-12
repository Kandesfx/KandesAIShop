/**
 * Route group layout — (admin-public).
 * Pages trong group này không có Header/Footer của root layout.
 *
 * Tách riêng `(admin-public)` (group không có guard) so với `(admin)`
 * (group có auth guard) để trang `/admin/login` render được mà không bị
 * loop bởi layout guard — xem git log D78b để biết lý do.
 */
export default function AdminPublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
