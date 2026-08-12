import { NextRequest, NextResponse } from 'next/server'

/**
 * Global middleware — P7-01 Security hardening.
 *
 * Runs before EVERY request. Lightweight only — no heavy DB calls.
 *
 * Guards:
 *   1. Security headers (CSP on HTML responses).
 *   2. Global IP rate-limit (brute-force / DDoS protection).
 *
 * Heavy checks (auth, RBAC, per-route rate-limit) stay in route handlers.
 */

const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}

/** In-memory brute-force tracker — reset on process restart (Vercel cold start friendly). */
const ipCounts = new Map<string, { count: number; resetAt: number }>()

/**
 * D78 fix: Routes that REQUIRE authentication. Middleware enforces this with
 * HTTP 307 redirect before reaching the layout — prevents the
 * `app/(admin)/layout.tsx` redirect-from-headers loop we hit in prod.
 *
 * Why middleware (not layout): Next.js `headers()` API in Server Components
 * does NOT reliably forward middleware-modified headers in standalone
 * output mode (Node 20 + Next 14.2.18). Moving the check to middleware
 * removes the dependency on header propagation.
 *
 * Public paths under `/admin/*` (skipped from auth check):
 *   - /admin/login (the login form itself)
 */
function isProtectedAdminPath(pathname: string): boolean {
  if (!pathname.startsWith('/admin')) return false
  if (pathname.startsWith('/admin/login')) return false
  return true
}

/**
 * Global rate-limit: 200 requests / 60s per IP.
 * Only triggers on /api/* routes to avoid static asset pressure.
 * Returns 429 if exceeded.
 */
function checkGlobalRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const WINDOW_MS = 60_000
  const LIMIT = 200

  // Cleanup old entries periodically
  if (ipCounts.size > 10_000) {
    for (const [k, v] of ipCounts) {
      if (v.resetAt <= now) ipCounts.delete(k)
    }
  }

  const entry = ipCounts.get(ip)
  if (!entry || entry.resetAt <= now) {
    ipCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  entry.count += 1
  if (entry.count > LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  return { allowed: true }
}

export async function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  // Inject pathname header để server components (layouts) có thể detect route
  // mà không cần client-side hook. Tránh các guard layouts trigger loop khi
  // chính trang login nằm trong route group có auth guard.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', req.nextUrl.pathname)

  // Global rate-limit on API routes only
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const { allowed, retryAfter } = checkGlobalRateLimit(ip)
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ ok: false, error: { code: 'RATE_LIMIT', message: `Quá nhiều request, thử lại sau ${retryAfter}s` } }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': '200',
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }
  }

  // D78: Auth guard for /admin/* — redirect to /admin/login when no session cookie.
  // This runs at the edge BEFORE React Server Components, so it can issue a real
  // HTTP 307 redirect (no meta-refresh, no layout-level loop).
  if (isProtectedAdminPath(req.nextUrl.pathname)) {
    const hasSession = req.cookies.has('kds_access')
    if (!hasSession) {
      const loginUrl = new URL('/admin/login', req.url)
      // Preserve the originally requested URL so login form can bounce back.
      const next = req.nextUrl.pathname + req.nextUrl.search
      loginUrl.searchParams.set('next', next)
      return NextResponse.redirect(loginUrl, { status: 307 })
    }
  }

  // Inject security headers on every response
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value)
  }

  // CSP header for HTML responses (browser, doc pages)
  const cspDirectives = [
    "default-src 'self'",
    // Fonts
    "font-src 'self' https://fonts.gstatic.com",
    // Images: self + Vercel blob + product CDN + VietQR + picsum
    "img-src 'self' data: https://*.vercel-blobs.com https://cdn.kandes.shop https://img.vietqr.io https://picsum.photos https://pub-*.r2.dev blob:",
    // Scripts: self + inline for Next.js hydration
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // Styles: self + inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Connect: self + Vercel runtime + Plausible analytics (if configured)
    "connect-src 'self' https://*.vercel-dns.com wss://*.vercel-dns.com",
    // Frames: none
    "frame-ancestors 'none'",
    // Base URI
    "base-uri 'self'",
    // Form action
    "form-action 'self'",
    // Upgrade insecure
    "upgrade-insecure-requests",
  ].join('; ')

  res.headers.set('Content-Security-Policy', cspDirectives)
  res.headers.set('X-RateLimit-Limit', '200')

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
}