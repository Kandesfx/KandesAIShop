import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
import { rateLimitOrThrow } from '@/lib/rate-limit'
import { usageQuerySchema } from '@/modules/ai-gateway/validators'
import { authenticateApiKey } from '@/modules/ai-gateway/auth'
import { db } from '@/lib/db'
import { UnauthorizedError } from '@/lib/errors'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/v1/usage
 *
 * Return usage của apiKey hiện tại (từ Bearer auth) trong 30 ngày gần nhất
 * hoặc theo range tùy chọn.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(`ai:usage:${ip ?? 'unknown'}`, 60, 60_000).catch(() => {})

    const ctx = await authenticateApiKey(req)
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const input = parseInput(usageQuerySchema, queryParams)

    const to = input.to ? new Date(input.to) : new Date()
    const from = input.from
      ? new Date(input.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

    const usages = await db.aiUsage.findMany({
      where: {
        apiKeyId: ctx.apiKey.id,
        createdAt: { gte: from, lte: to },
        ...(input.model ? { model: input.model } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    const totalTokens = usages.reduce((sum, u) => sum + u.totalTokens, 0)
    const totalCostUsd = usages.reduce((sum, u) => {
      const c = u.upstreamCostUsd ? Number(u.upstreamCostUsd) : 0
      return sum + c
    }, 0)

    return ok(
      serialize({
        range: { from: from.toISOString(), to: to.toISOString() },
        items: usages.map((u) => ({
          id: u.id,
          requestId: u.requestId,
          model: u.model,
          promptTokens: u.promptTokens,
          completionTokens: u.completionTokens,
          totalTokens: u.totalTokens,
          upstreamCostUsd: u.upstreamCostUsd ? Number(u.upstreamCostUsd) : null,
          latencyMs: u.latencyMs,
          createdAt: u.createdAt.toISOString(),
        })),
        totalTokens,
        totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      })
    )
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      )
    }
    return fail(err, req)
  }
}