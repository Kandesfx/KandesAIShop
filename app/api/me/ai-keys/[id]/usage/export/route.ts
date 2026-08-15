import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/me/ai-keys/[id]/usage/export — export usage data as CSV or JSON.
 * 
 * Query params:
 * - from: ISO date string
 * - to: ISO date string  
 * - format: 'csv' | 'json' (default: csv)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)
    const { id: apiKeyId } = await params

    const url = new URL(req.url)
    const from = url.searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const to = url.searchParams.get('to') || new Date().toISOString()
    const format = url.searchParams.get('format') || 'csv'

    // Verify ownership
    const apiKey = await db.aiApiKey.findUnique({
      where: { id: apiKeyId },
      select: { userId: true, name: true },
    })

    if (!apiKey || apiKey.userId !== user.id) {
      return NextResponse.json({ ok: false, error: { message: 'Not found' } }, { status: 404 })
    }

    // Fetch usage data
    const usage = await db.aiUsage.findMany({
      where: {
        apiKeyId,
        createdAt: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        upstreamCostUsd: true,
      },
    })

    // Format data
    const records = usage.map((u) => ({
      date: u.createdAt.toISOString(),
      model: u.model,
      promptTokens: Number(u.promptTokens),
      completionTokens: Number(u.completionTokens),
      totalTokens: Number(u.totalTokens),
      upstreamCostUsd: Number(u.upstreamCostUsd),
    }))

    if (format === 'json') {
      return NextResponse.json({
        apiKeyId,
        apiKeyName: apiKey.name,
        dateRange: { from, to },
        exportedAt: new Date().toISOString(),
        totalRecords: records.length,
        records,
      })
    }

    // CSV format
    const headers = ['date', 'model', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'upstream_cost_usd']
    const csvRows = [
      headers.join(','),
      ...records.map((r) =>
        [
          r.date,
          `"${r.model}"`,
          r.promptTokens,
          r.completionTokens,
          r.totalTokens,
          r.upstreamCostUsd.toFixed(6),
        ].join(',')
      ),
    ]

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="usage-${apiKeyId}-${from}-${to}.csv"`,
      },
    })
  } catch (err) {
    return fail(err, req)
  }
}
