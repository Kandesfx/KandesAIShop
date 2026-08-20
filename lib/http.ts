import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema, z } from 'zod'
import { AppError, ValidationError } from './errors'
import { logger } from './logger'
import { serialize } from './serialize'

/**
 * Helper chuẩn hoá response shape + error mapping cho Route Handlers.
 *
 * Theo MASTER_SPEC §4.4:
 *   - Success: { ok: true, data }
 *   - Error:   { ok: false, error: { code, message, fields? } }
 *
 * Tất cả response JSON đều đi qua serialize() để:
 *   - BigInt → string
 *   - Date → ISO string
 *   - Prisma.Decimal → number
 *   - Buffer/Uint8Array → base64
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(serialize({ ok: true, data }), init)
}

export function fail(err: unknown, req?: NextRequest) {
  if (err instanceof ZodError) {
    const fields = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          fields,
        },
      },
      { status: 422 }
    )
  }

  if (err instanceof AppError) {
    return NextResponse.json(serialize({ ok: false, error: err.toJSON() }), {
      status: err.statusCode,
    })
  }

  // Unknown error — log + generic 500
  const requestId = req?.headers.get('x-request-id') ?? undefined
  logger.error({ err, requestId, url: req?.url }, 'Unhandled error in route')

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL',
        message:
          process.env.NODE_ENV === 'production'
            ? 'Đã có lỗi xảy ra'
            : err instanceof Error
              ? err.message
              : String(err),
      },
    },
    { status: 500 }
  )
}

/** Parse + validate input qua Zod schema, throw ValidationError nếu fail */
export function parseInput<S extends ZodSchema>(schema: S, data: unknown): z.infer<S> {
  try {
    return schema.parse(data) as z.infer<S>
  } catch (err) {
    if (err instanceof ZodError) {
      const fields = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      throw new ValidationError('Dữ liệu không hợp lệ', fields)
    }
    throw err
  }
}

/** Get client IP từ request — dùng cho audit log */
export function getClientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined
  )
}

/**
 * CSRF / Origin check — verify request đến từ cùng origin với app.
 *
 * Áp dụng cho:
 *   - Tất cả mutating routes (POST/PUT/PATCH/DELETE) trừ webhooks (verify HMAC thay).
 *   - Auth routes (login/register/reset) — extra layer ngoài SameSite cookies.
 *
 * Bypass:
 *   - GET/HEAD/OPTIONS
 *   - Khi header `Origin`/`Referer` KHÔNG có (e.g. mobile native client, server-to-server)
 *     → chỉ cần biết rủi ro; SameSite=Lax cookies đã là defense chính.
 *   - Khi host = localhost / 127.0.0.1 → dev mode.
 *
 * @returns true nếu request hợp lệ, false nếu cross-site.
 */
export function isSameOriginRequest(req: NextRequest): boolean {
  const method = req.method.toUpperCase()
  // Safe methods không cần check.
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true

  const origin = req.headers.get('origin')?.toLowerCase()
  const referer = req.headers.get('referer')?.toLowerCase()

  const allowedOrigins = new Set<string>()

  // 1. Configured APP_URL
  if (process.env.APP_URL) {
    allowedOrigins.add(process.env.APP_URL.toLowerCase().replace(/\/$/, ''))
  }
  // 2. Production / Dev known domains
  allowedOrigins.add('https://kandes.shop')
  allowedOrigins.add('https://www.kandes.shop')
  allowedOrigins.add('https://api.kandes.shop')
  allowedOrigins.add('http://localhost:3000')
  allowedOrigins.add('http://127.0.0.1:3000')

  // 3. Dynamic host from headers
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (host) {
    allowedOrigins.add(`${proto}://${host}`.toLowerCase().replace(/\/$/, ''))
    allowedOrigins.add(`https://${host}`.toLowerCase().replace(/\/$/, ''))
    allowedOrigins.add(`http://${host}`.toLowerCase().replace(/\/$/, ''))
  }

  const checkOriginMatch = (reqOrigin: string) => {
    const cleaned = reqOrigin.replace(/\/$/, '')
    for (const allowed of allowedOrigins) {
      if (cleaned === allowed || cleaned.startsWith(allowed + '/')) {
        return true
      }
    }
    return false
  }

  if (origin) {
    return checkOriginMatch(origin)
  }

  if (referer) {
    try {
      const refUrl = new URL(referer)
      const refOrigin = `${refUrl.protocol}//${refUrl.host}`.toLowerCase()
      return checkOriginMatch(refOrigin)
    } catch {
      return false
    }
  }

  // Không có Origin/Referer → allow (server-to-server, native app, dev).
  // SameSite=Lax cookie đã bảo vệ; nếu strict mode cần, wrap caller.
  return true
}

/** Shorthand: throw CSRF error nếu cross-origin. */
export function assertSameOrigin(req: NextRequest): void {
  if (!isSameOriginRequest(req)) {
    throw new AppError(
      'CSRF_FORBIDDEN',
      'Yêu cầu bị từ chối do cross-origin không hợp lệ',
      403
    )
  }
}

/** Ghép cache headers cho public GET (short edge cache). */
export function withShortCache(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return res
}
