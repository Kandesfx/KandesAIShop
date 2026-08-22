/**
 * Health checks — P4-10.
 *
 * Tổng hợp trạng thái subsystems: DB, Redis (Upstash), SePay, Email, Queue.
 * Mỗi check trả { status: 'ok' | 'warn' | 'fail' | 'n/a', message, latencyMs }.
 *
 * Stub-friendly: khi thiếu config → trả 'n/a' (không fail).
 */

import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export type HealthStatus = 'ok' | 'warn' | 'fail' | 'n/a'

export interface HealthCheck {
  name: string
  status: HealthStatus
  message: string
  latencyMs: number
  detail?: Record<string, unknown>
}

export interface HealthSummary {
  overall: HealthStatus
  checkedAt: string
  checks: HealthCheck[]
}

async function time<T>(fn: () => Promise<T>): Promise<{ value: T | null; latencyMs: number; error: string | null }> {
  const start = Date.now()
  try {
    const value = await fn()
    return { value, latencyMs: Date.now() - start, error: null }
  } catch (err) {
    return {
      value: null,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'check failed',
    }
  }
}

export const healthService = {
  /** DB — Postgres must respond. */
  async checkDatabase(): Promise<HealthCheck> {
    const t = await time(async () => {
      // SELECT 1 là cheapest deterministic query
      await db.$queryRaw`SELECT 1`
      return true
    })
    if (t.error) {
      logger.warn({ err: t.error, latencyMs: t.latencyMs }, 'health: DB fail')
      return {
        name: 'database',
        status: 'fail',
        message: `DB error: ${t.error}`,
        latencyMs: t.latencyMs,
      }
    }
    return {
      name: 'database',
      status: t.latencyMs > 1000 ? 'warn' : 'ok',
      message: t.latencyMs > 1000 ? 'DB chậm (>1s)' : 'DB OK',
      latencyMs: t.latencyMs,
    }
  },

  /** Redis (Upstash REST) — optional; `n/a` khi thiếu config. */
  async checkRedis(): Promise<HealthCheck> {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      return {
        name: 'redis',
        status: 'n/a',
        message: 'UPSTASH_REDIS chưa config (Phase 5+ mới cần)',
        latencyMs: 0,
      }
    }
    const t = await time(async () => {
      const resp = await fetch(`${env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      })
      if (!resp.ok) throw new Error(`Upstash returned ${resp.status}`)
      return true
    })
    if (t.error) {
      return {
        name: 'redis',
        status: 'fail',
        message: `Redis error: ${t.error}`,
        latencyMs: t.latencyMs,
      }
    }
    return {
      name: 'redis',
      status: t.latencyMs > 500 ? 'warn' : 'ok',
      message: 'Redis OK',
      latencyMs: t.latencyMs,
    }
  },

  /** SePay API — check account_number/balance hoặc simple ping. */
  async checkSepay(): Promise<HealthCheck> {
    if (!env.SEPAY_API_TOKEN || !env.SEPAY_ACCOUNT_NUMBER) {
      return {
        name: 'sepay',
        status: 'n/a',
        message: 'SEPAY_API_TOKEN / SEPAY_ACCOUNT_NUMBER chưa config',
        latencyMs: 0,
      }
    }
    const t = await time(async () => {
      const url = new URL('https://my.sepay.vn/userapi/transactions/list')
      url.searchParams.set('account_number', env.SEPAY_ACCOUNT_NUMBER ?? '')
      url.searchParams.set('limit', '1')
      const resp = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${env.SEPAY_API_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!resp.ok) throw new Error(`SePay returned ${resp.status}`)
      return true
    })
    if (t.error) {
      return {
        name: 'sepay',
        status: 'fail',
        message: `SePay error: ${t.error}`,
        latencyMs: t.latencyMs,
      }
    }
    return {
      name: 'sepay',
      status: t.latencyMs > 2000 ? 'warn' : 'ok',
      message: 'SePay OK',
      latencyMs: t.latencyMs,
    }
  },

  /** Email provider — check config hợp lệ + test outbound connectivity. */
  async checkEmail(): Promise<HealthCheck> {
    const start = Date.now()
    if (env.EMAIL_PROVIDER === 'console') {
      return {
        name: 'email',
        status: 'n/a',
        message: 'EMAIL_PROVIDER=console (dev mode — log ra terminal)',
        latencyMs: Date.now() - start,
      }
    }
    if (env.EMAIL_PROVIDER === 'resend') {
      if (!env.RESEND_API_KEY) {
        return {
          name: 'email',
          status: 'fail',
          message: 'EMAIL_PROVIDER=resend nhưng thiếu RESEND_API_KEY',
          latencyMs: Date.now() - start,
        }
      }
      // Outbound connectivity test to Resend API
      try {
        const resp = await fetch('https://api.resend.com', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        })
        const latency = Date.now() - start
        return {
          name: 'email',
          status: resp.ok || resp.status < 500 ? 'ok' : 'warn',
          message: `Resend API reachable (${latency}ms) — Provider active`,
          latencyMs: latency,
        }
      } catch (err) {
        return {
          name: 'email',
          status: 'fail',
          message: `Không kết nối được Resend API (AWS Security Group có thể đang chặn outbound 443): ${err instanceof Error ? err.message : String(err)}`,
          latencyMs: Date.now() - start,
        }
      }
    }
    if (env.EMAIL_PROVIDER === 'ses') {
      return {
        name: 'email',
        status: 'n/a',
        message: 'SES provider chưa wire credentials (Phase 5+)',
        latencyMs: Date.now() - start,
      }
    }
    return {
      name: 'email',
      status: 'ok',
      message: `Provider ${env.EMAIL_PROVIDER} configured`,
      latencyMs: Date.now() - start,
    }
  },

  /** Notification queue — DB FIFO. Check có rows pending/queued >0 không. */
  async checkQueue(): Promise<HealthCheck> {
    const t = await time(async () => {
      const counts = await db.notification.groupBy({
        by: ['status'],
        _count: { _all: true },
      })
      return Object.fromEntries(
        counts.map((c) => [c.status, c._count._all])
      ) as Record<string, number>
    })
    if (t.error) {
      return {
        name: 'queue',
        status: 'fail',
        message: `Queue query error: ${t.error}`,
        latencyMs: t.latencyMs,
      }
    }
    const counts = t.value ?? {}
    const queued = counts.queued ?? 0
    const failed = counts.failed ?? 0
    const status: HealthStatus = failed > 50 ? 'warn' : 'ok'
    return {
      name: 'queue',
      status,
      message: `Queued: ${queued} · Failed: ${failed}`,
      latencyMs: t.latencyMs,
      detail: counts,
    }
  },

  /** Cron jobs — lấy list đã register. */
  async checkCron(): Promise<HealthCheck> {
    const { listJobs } = await import('@/modules/jobs')
    const start = Date.now()
    const jobs = listJobs()
    return {
      name: 'cron',
      status: 'ok',
      message: `${jobs.length} jobs registered: ${jobs.join(', ')}`,
      latencyMs: Date.now() - start,
      detail: { jobs },
    }
  },

  /** Tổng hợp tất cả checks. */
  async runAll(): Promise<HealthSummary> {
    const [database, redis, sepay, email, queue, cron] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkSepay(),
      this.checkEmail(),
      this.checkQueue(),
      this.checkCron(),
    ])
    const checks = [database, redis, sepay, email, queue, cron]

    // Overall = worst case (fail > warn > ok > n/a)
    const rank: Record<HealthStatus, number> = { fail: 3, warn: 2, ok: 1, 'n/a': 0 }
    let overall: HealthStatus = 'ok'
    for (const c of checks) {
      if (rank[c.status] > rank[overall]) overall = c.status
    }

    return {
      overall,
      checkedAt: new Date().toISOString(),
      checks,
    }
  },
}
