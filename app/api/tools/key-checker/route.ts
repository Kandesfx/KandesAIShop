import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rateLimitOrThrow } from '@/lib/rate-limit'
import { ValidationError, UnauthorizedError } from '@/lib/errors'
import { db } from '@/lib/db'
import { sha256, constantTimeEqual } from '@/modules/ai-gateway/token'
import { serialize } from '@/lib/serialize'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/tools/key-checker — Public key status checker.
 *
 * User paste key `ks-xxx` → trả về trạng thái masked (KHÔNG lộ thông tin nhạy cảm):
 *   - valid / expired / revoked / suspended
 *   - quota used / total (tokens)
 *   - plan name
 *   - expiresAt / lastUsedAt
 *
 * KHÔNG trả:
 *   - userId, email, NCC key info, raw keyHash.
 *   - Không cần auth (public endpoint) — nhưng rate-limit chặt (10/min/IP).
 *
 * Security:
 *   - Lookup by keyPrefix (12 chars) → SHA-256 compare (constant-time).
 *   - Timing-safe: consistent delay cho cả found/not-found.
 *   - Rate-limit per IP: 10 requests per minute.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Rate-limit per IP
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'
    await rateLimitOrThrow(`key-checker:${ip}`, 10, 60_000)

    const body = await req.json().catch(() => null)
    const token = typeof body?.key === 'string' ? body.key.trim() : ''

    // Validate format
    if (!token || !token.startsWith('ks-') || token.length < 16) {
      throw new ValidationError(
        'Key không hợp lệ. API key phải bắt đầu bằng "ks-" và có ít nhất 16 ký tự.'
      )
    }

    const keyPrefix = token.slice(0, 12)
    const apiKeyRow = await db.aiApiKey.findUnique({
      where: { keyPrefix },
      include: {
        plan: { select: { name: true, quotaTokens: true, softCapTokens: true } },
      },
    })

    // Constant delay to prevent timing-based enumeration
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 50))

    if (!apiKeyRow) {
      throw new UnauthorizedError('API key không tồn tại hoặc đã bị xóa.')
    }

    // Verify hash (constant-time)
    const expectedHash = sha256(token)
    if (!constantTimeEqual(expectedHash, apiKeyRow.keyHash)) {
      throw new UnauthorizedError('API key không hợp lệ.')
    }

    // Determine status
    let status: 'active' | 'expired' | 'revoked' | 'suspended'
    let statusMessage: string

    if (apiKeyRow.status === 'revoked') {
      status = 'revoked'
      statusMessage = 'Key đã bị thu hồi.'
    } else if (apiKeyRow.status === 'suspended') {
      status = 'suspended'
      statusMessage = 'Key đang bị tạm ngưng.'
    } else if (apiKeyRow.expiresAt && apiKeyRow.expiresAt.getTime() < Date.now()) {
      status = 'expired'
      statusMessage = 'Key đã hết hạn.'
    } else {
      status = 'active'
      statusMessage = 'Key đang hoạt động bình thường.'
    }

    // Quota info
    const quotaUsed = Number(apiKeyRow.quotaUsedTokens)
    const quotaTotal = Number(apiKeyRow.plan.quotaTokens)
    const softCap = apiKeyRow.plan.softCapTokens ? Number(apiKeyRow.plan.softCapTokens) : null
    const quotaPercent = quotaTotal > 0 ? Math.round((quotaUsed / quotaTotal) * 100) : 0
    const isOverSoftCap = softCap != null && quotaUsed > softCap

    return ok(
      serialize({
        status,
        statusMessage,
        planName: apiKeyRow.plan.name,
        quota: {
          used: quotaUsed,
          total: quotaTotal,
          percent: quotaPercent,
          isOverSoftCap,
        },
        keyName: apiKeyRow.name ?? `Key ${apiKeyRow.keyPrefix}...`,
        createdAt: apiKeyRow.createdAt,
        expiresAt: apiKeyRow.expiresAt,
        lastUsedAt: apiKeyRow.lastUsedAt,
      })
    )
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'tools/key-checker error')
    return fail(err, req)
  }
}
