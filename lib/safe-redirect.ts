/**
 * Validate `?next=...` URL used in post-login redirects.
 *
 * Chỉ accept relative paths bắt đầu với "/" nhưng KHÔNG "//"
 * (loại protocol-relative như `//evil.com`). Bỏ qua external URLs, hash-only,
 * và các path bắt đầu bằng `/\` (backslash trick).
 *
 * @example
 *   safeNext('/login?next=/account', '/login');           // '/account'
 *   safeNext('/login?next=https://evil.com', '/login');   // '/login'
 *   safeNext('/login?next=//evil.com/x', '/login');       // '/login'
 *   safeNext('/login?next=/\\evil.com', '/login');       // '/login'
 *   safeNext(null, '/account');                           // '/account'
 */
export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  const s = String(raw).trim()
  if (!s) return fallback
  if (!s.startsWith('/')) return fallback
  if (s.startsWith('//')) return fallback
  if (s.startsWith('/\\')) return fallback
  return s
}
