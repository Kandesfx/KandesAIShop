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

/** Ghép cache headers cho public GET (short edge cache). */
export function withShortCache(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return res
}
