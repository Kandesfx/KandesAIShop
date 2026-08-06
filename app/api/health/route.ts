import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health — Public liveness + readiness cho Docker healthcheck, CloudWatch
 * alarm, và uptime monitor (UptimeRobot).
 *
 * Phân biệt với `/api/admin/health` (P4-10) — endpoint đó trả chi tiết từng
 * subsystem nhưng cần admin role. Endpoint này trả tối thiểu để probe và
 * KHÔNG lộ thông tin nhạy cảm (URLs, secrets, provider details).
 *
 * Response shape:
 *   200 — { status: 'ok' | 'degraded', db: 'up' | 'down', uptime, version? }
 *   503 — DB down (kích hoạt Docker restart hoặc alarm)
 *
 * Latency target: <100ms (DB SELECT 1 là nhanh nhất; không query schema thật).
 */
export async function GET(_req: NextRequest) {
  const start = Date.now()

  // DB ping — chỉ SELECT 1, không query schema.
  let dbUp = false
  try {
    await db.$queryRaw`SELECT 1`
    dbUp = true
  } catch (err) {
    logger.warn({ err }, 'health: DB ping failed')
  }

  const body = {
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
  }

  // 503 khi DB down → Docker healthcheck sẽ restart container,
  // UptimeRobot alarm sẽ kêu.
  return NextResponse.json(body, { status: dbUp ? 200 : 503 })
}
