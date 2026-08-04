import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, parseInput } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { createApiKeySchema } from '@/modules/ai-gateway/validators'
import { generateApiToken } from '@/modules/ai-gateway/auth'
import { encrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/me/ai-keys — list user's API keys (masked prefix).
 * POST /api/me/ai-keys — create new key. Returns plaintext 1 lần.
 *
 * Phase 6 P6-08. User KHÔNG được tạo source='kandes_purchased' trực tiếp —
 * chỉ qua mua gói (P6-11). Nếu muốn bind trực tiếp NCC key (Phase 7+),
 * dùng source='user_provided'.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)
    const keys = await db.aiApiKey.findMany({
      where: { userId: user.id },
      include: { plan: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok(
      serialize(
        keys.map((k) => ({
          id: k.id,
          name: k.name,
          keyMasked: `ks-${k.keyPrefix.slice(3, 8)}****`,
          plan: { name: k.plan.name, slug: k.plan.slug },
          status: k.status,
          source: k.source,
          quotaUsedTokens: k.quotaUsedTokens.toString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          expiresAt: k.expiresAt?.toISOString() ?? null,
          createdAt: k.createdAt.toISOString(),
        }))
      )
    )
  } catch (err) {
    return fail(err, req)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)
    const input = parseInput(createApiKeySchema, await req.json())

    // Resolve plan
    const plan = input.planId
      ? await db.aiPlan.findUnique({ where: { id: input.planId } })
      : await db.aiPlan.findFirst({ where: { isActive: true }, orderBy: { priceCents: 'asc' } })

    if (!plan) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Plan không tồn tại' },
        },
        { status: 404 }
      )
    }

    // Tạo token
    const { token, keyPrefix, keyHash } = generateApiToken()
    const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000)

    const created = await db.aiApiKey.create({
      data: {
        userId: user.id,
        planId: plan.id,
        nccKeyId: input.nccKeyId ?? null,
        source: 'user_provided',
        name: input.name,
        keyPrefix,
        keyHash,
        status: 'active',
        expiresAt,
      },
      select: { id: true, createdAt: true },
    })

    logger.info(
      { apiKeyId: created.id, userId: user.id, planId: plan.id },
      'user: created API key (user_provided)'
    )

    // Response trả plaintext 1 lần.
    return NextResponse.json(
      {
        ok: true,
        data: {
          id: created.id,
          name: input.name,
          key: token,
          keyMasked: `ks-${keyPrefix.slice(3, 8)}****`,
          plan: { name: plan.name, slug: plan.slug },
          expiresAt: expiresAt.toISOString(),
          createdAt: created.createdAt.toISOString(),
          warning: 'Lưu key này ngay — chỉ hiển thị 1 lần.',
        },
      },
      { status: 201 }
    )
  } catch (err) {
    return fail(err, req)
  }
}