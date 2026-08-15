import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rbacGuard } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type HealthStatus = 'ok' | 'degraded' | 'down'

type ProviderHealth = {
  provider: string
  status: HealthStatus
  latencyMs: number | null
  lastCheckedAt: string
  uptimePercent: number
  errorCount: number
  totalRequests: number
}

type NccKeyHealth = {
  id: string
  nickname: string | null
  status: string
  remainingUsd: number
  totalQuotaUsd: number
  usagePercent: number
  lastSyncedAt: string | null
  isHealthy: boolean
}

/**
 * GET /api/admin/ai/health — provider health dashboard
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await rbacGuard(req, ['admin', 'super_admin'])

    // Get all NCC keys with their stats
    const nccKeys = await db.aiNccKey.findMany({
      select: {
        id: true,
        nickname: true,
        status: true,
        remainingUsd: true,
        totalQuotaUsd: true,
        lastSyncedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate key health
    const keysWithHealth: NccKeyHealth[] = nccKeys.map((key) => {
      const remaining = Number(key.remainingUsd)
      const total = Number(key.totalQuotaUsd)
      const usagePercent = total > 0 ? ((total - remaining) / total) * 100 : 0
      
      let isHealthy = true
      if (key.status === 'exhausted' || remaining <= 0) isHealthy = false
      if (key.status === 'disabled') isHealthy = false
      if (usagePercent >= 95) isHealthy = false

      return {
        id: key.id,
        nickname: key.nickname,
        status: key.status,
        remainingUsd: remaining,
        totalQuotaUsd: total,
        usagePercent,
        lastSyncedAt: key.lastSyncedAt?.toISOString() ?? null,
        isHealthy,
      }
    })

    // Calculate provider health (based on key health)
    const healthyKeys = keysWithHealth.filter((k) => k.isHealthy).length
    const totalKeys = keysWithHealth.length
    const activeKeys = keysWithHealth.filter((k) => k.status === 'active' || k.status === 'low_balance').length
    
    let providerStatus: HealthStatus = 'ok'
    if (healthyKeys === 0 && totalKeys > 0) {
      providerStatus = 'down'
    } else if (healthyKeys < totalKeys / 2) {
      providerStatus = 'degraded'
    }

    const totalBalance = nccKeys.reduce((sum, k) => sum + Number(k.remainingUsd), 0)
    const totalQuota = nccKeys.reduce((sum, k) => sum + Number(k.totalQuotaUsd), 0)
    const overallUsagePercent = totalQuota > 0 ? ((totalQuota - totalBalance) / totalQuota) * 100 : 0

    const providerHealth: ProviderHealth = {
      provider: 'ccpro',
      status: providerStatus,
      latencyMs: null, // Would need to ping NCC API to get this
      lastCheckedAt: new Date().toISOString(),
      uptimePercent: totalKeys > 0 ? (healthyKeys / totalKeys) * 100 : 100,
      errorCount: 0, // Would need to track this
      totalRequests: 0, // Would need to track this
    }

    return ok(
      serialize({
        provider: providerHealth,
        summary: {
          totalKeys,
          healthyKeys,
          activeKeys,
          totalBalance,
          totalQuota,
          overallUsagePercent,
        },
        keys: keysWithHealth,
      })
    )
  } catch (err) {
    return fail(err, req)
  }
}
