import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { UnauthorizedError } from '@/lib/errors'

/**
 * Verify cron request is from an authorized caller.
 *
 * Authorization header: `Bearer ${CRON_SECRET}`.
 * Constant-time compare so schedule platform (Vercel Cron, uptime monitor,
 * admin cURL) cannot be brute-forced via timing side-channel.
 *
 * D29: dev fallback secret đủ dài nhưng marker `dev-` lộ → vẫn chấp nhận,
 * admin phải rotate khi go-live.
 *
 * Trả 0 (success) | throw UnauthorizedError.
 */
export function verifyCronAuth(req: NextRequest): { caller: string } {
  const header = req.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  const provided = match?.[1]?.trim()

  if (!provided) {
    throw new UnauthorizedError('Missing cron bearer token')
  }

  const expected = env.CRON_SECRET

  // Buffers must be equal length trước khi timingSafeEqual.
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new UnauthorizedError('Invalid cron bearer token')
  }

  return { caller: header.slice(0, 32) }
}

/** Header để caller (nếu là admin tool) đính kèm identity — chỉ log, không auth. */
export function cronCallerLabel(req: NextRequest): string | undefined {
  return req.headers.get('x-cron-caller') ?? undefined
}
