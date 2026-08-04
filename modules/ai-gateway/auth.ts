import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { decrypt } from '@/lib/encryption'
import { sha256, constantTimeEqual } from './token'
import type { AuthContext } from './types'

/**
 * AI Gateway auth — Phase 6 P6-03.
 *
 * Xác thực Bearer `ks-xxx` token, resolve user + plan + NCC upstream key.
 *
 * Token format: `ks-` + 16 chars base64url random.
 * Storage: SHA-256 hash + unique 12-char prefix (keyPrefix).
 *
 * Flow (D47):
 *   1. Parse `Authorization: Bearer <token>`.
 *   2. Validate format (start with `ks-`, length ≥ 16).
 *   3. Lookup by `keyPrefix` (unique indexed).
 *   4. SHA-256(fullToken) === keyHash (constant-time compare).
 *   5. status='active' + expiresAt > now.
 *   6. Resolve user + plan + upstream API key (decrypt từ AiNccKey hoặc fail).
 *   7. Update `lastUsedAt` async (fire-and-forget).
 */

const TOKEN_MIN_LENGTH = 16

export type { GeneratedToken } from './token'
export { generateApiToken, sha256, constantTimeEqual } from './token'

/** Extract Bearer token from Authorization header (case-insensitive). */
function extractBearer(req: Request): string | null {
  const header = req.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() ?? null
}

/**
 * Authenticate Bearer API key request.
 * Throw UnauthorizedError / ForbiddenError on failure.
 * Trả về AuthContext với everything cần để forward + log usage.
 */
export async function authenticateApiKey(req: Request): Promise<AuthContext> {
  const token = extractBearer(req)
  if (!token) {
    throw new UnauthorizedError('Missing Authorization Bearer header')
  }
  if (!token.startsWith('ks-') || token.length < TOKEN_MIN_LENGTH) {
    throw new UnauthorizedError('Invalid API key format')
  }

  const keyPrefix = token.slice(0, 12)
  const apiKeyRow = await db.aiApiKey.findUnique({
    where: { keyPrefix },
    include: {
      plan: true,
      user: { select: { id: true, email: true, role: true, status: true } },
      nccKey: true,
    },
  })

  if (!apiKeyRow) {
    // Constant-ish delay để chống timing attack enumerate prefix.
    await new Promise((r) => setTimeout(r, 50))
    throw new UnauthorizedError('Invalid API key')
  }

  // Verify hash (constant-time)
  const expectedHash = sha256(token)
  if (!constantTimeEqual(expectedHash, apiKeyRow.keyHash)) {
    await new Promise((r) => setTimeout(r, 50))
    throw new UnauthorizedError('Invalid API key')
  }

  if (apiKeyRow.status !== 'active') {
    throw new ForbiddenError(`API key is ${apiKeyRow.status}`)
  }

  if (apiKeyRow.expiresAt && apiKeyRow.expiresAt.getTime() < Date.now()) {
    throw new ForbiddenError('API key expired')
  }

  if (apiKeyRow.user.status !== 'active') {
    throw new ForbiddenError('User account is not active')
  }

  if (!apiKeyRow.plan.isActive) {
    throw new ForbiddenError('Plan is no longer active')
  }

  // Resolve upstream API key
  let upstreamApiKey: string
  if (apiKeyRow.source === 'kandes_purchased') {
    if (!apiKeyRow.nccKey) {
      throw new ForbiddenError('API key không gắn NCC upstream — liên hệ admin')
    }
    if (apiKeyRow.nccKey.status === 'exhausted' || apiKeyRow.nccKey.status === 'disabled') {
      throw new ForbiddenError(`NCC upstream ${apiKeyRow.nccKey.status}`)
    }
    try {
      upstreamApiKey = decrypt(Buffer.from(apiKeyRow.nccKey.apiKeyEncrypted))
    } catch (err) {
      logger.error(
        { err: (err as Error).message, apiKeyId: apiKeyRow.id, nccKeyId: apiKeyRow.nccKey.id },
        'auth: failed to decrypt NCC key'
      )
      throw new ForbiddenError('NCC upstream key corrupt — liên hệ admin')
    }
  } else {
    // 'user_provided' — Phase 6 chưa support, fail closed.
    throw new ForbiddenError('User-provided keys chưa support ở Phase 6')
  }

  // Update lastUsedAt async — không block auth.
  void db.aiApiKey
    .update({
      where: { id: apiKeyRow.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => {
      logger.warn(
        { err: (err as Error).message, apiKeyId: apiKeyRow.id },
        'auth: failed to update lastUsedAt (non-fatal)'
      )
    })

  return {
    apiKey: {
      id: apiKeyRow.id,
      userId: apiKeyRow.userId,
      planId: apiKeyRow.planId,
      nccKeyId: apiKeyRow.nccKeyId,
      source: apiKeyRow.source,
      expiresAt: apiKeyRow.expiresAt,
      quotaUsedTokens: apiKeyRow.quotaUsedTokens,
    },
    user: {
      id: apiKeyRow.user.id,
      email: apiKeyRow.user.email,
      role: apiKeyRow.user.role,
    },
    plan: {
      id: apiKeyRow.plan.id,
      name: apiKeyRow.plan.name,
      slug: apiKeyRow.plan.slug,
      rateLimitPerMinute: apiKeyRow.plan.rateLimitPerMinute,
      quotaTokens: apiKeyRow.plan.quotaTokens,
      softCapTokens: apiKeyRow.plan.softCapTokens,
    },
    upstreamApiKey,
    provider: apiKeyRow.nccKey?.provider ?? 'ccpro',
  }
}