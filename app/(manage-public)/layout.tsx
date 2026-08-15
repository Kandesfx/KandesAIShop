/**
 * Route group layout — (manage-public).
 * Pages trong group này không có Header/Footer của root layout.
 *
 * Tách riêng `(manage-public)` (group không có guard) so với `(manage)`
 * (group có auth guard) để trang `/manage/login` render được mà không bị
 * loop bởi layout guard.
 */
export default function AdminPublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
