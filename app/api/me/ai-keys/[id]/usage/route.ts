import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, parseInput } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { NotFoundError } from '@/lib/errors'
import { db } from '@/lib/db'
import { usageQuerySchema } from '@/modules/ai-gateway/validators'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/me/ai-keys/[id]/usage — usage chart data cho 1 key của user hiện tại.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)
    const { id } = await params
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const input = parseInput(usageQuerySchema, queryParams)

    const key = await db.aiApiKey.findUnique({ where: { id } })
    if (!key) throw new NotFoundError('API key không tồn tại')
    if (key.userId !== user.id) throw new NotFoundError('API key không tồn tại')

    const to = input.to ? new Date(input.to) : new Date()
    const from = input.from
      ? new Date(input.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

    const usages = await db.aiUsage.findMany({
      where: { apiKeyId: id, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'asc' },
    })

    // Aggregate by day
    const byDay = new Map<string, { tokens: number; cost: number; count: number }>()
    const byModel = new Map<string, { tokens: number; count: number }>()

    for (const u of usages) {
      const day = u.createdAt.toISOString().slice(0, 10)
      const d = byDay.get(day) ?? { tokens: 0, cost: 0, count: 0 }
      d.tokens += u.totalTokens
      d.cost += u.upstreamCostUsd ? Number(u.upstreamCostUsd) : 0
      d.count += 1
      byDay.set(day, d)

      const m = byModel.get(u.model) ?? { tokens: 0, count: 0 }
      m.tokens += u.totalTokens
      m.count += 1
      byModel.set(u.model, m)
    }

    const totalTokens = usages.reduce((s, u) => s + u.totalTokens, 0)

    return ok(
      serialize({
        range: { from: from.toISOString(), to: to.toISOString() },
        totalTokens,
        daily: [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ date, tokens: v.tokens, costUsd: Math.round(v.cost * 100) / 100, count: v.count })),
        byModel: [...byModel.entries()]
          .sort(([, a], [, b]) => b.tokens - a.tokens)
          .map(([model, v]) => ({ model, tokens: v.tokens, count: v.count })),
      })
    )
  } catch (err) {
    return fail(err, req)
  }
}