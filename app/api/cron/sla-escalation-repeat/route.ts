import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { slaEscalationRepeatCron } from '@/modules/sla/repeat-cron'

/**
 * GET /api/cron/sla-escalation-repeat
 *
 * Cron job: mỗi 5 phút re-fire loud escalation cho các đơn đang paid/processing
 * mà đã vượt level 3 (>= 120 phút).
 *
 * Auth: header `x-cron-secret` phải khớp `CRON_SECRET` env.
 *
 * Body (POST/GET): { limit?: number; dryRun?: boolean }
 */
export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}

async function handle(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (!env.CRON_SECRET || secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const limitRaw = req.nextUrl.searchParams.get('limit')
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  const limit = limitRaw ? Number(limitRaw) : 200

  const result = await slaEscalationRepeatCron.runSlaEscalationRepeatCron({ limit, dryRun })
  return NextResponse.json({ ok: true, result })
}
