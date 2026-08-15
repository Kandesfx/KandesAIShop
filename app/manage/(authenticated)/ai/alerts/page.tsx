import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'
import QuotaAlertsClient from './QuotaAlertsClient'

export const dynamic = 'force-dynamic'

type Alert = {
  id: string
  type: 'ncc_low_balance' | 'ncc_exhausted' | 'api_key_over_soft_cap'
  severity: 'warning' | 'danger' | 'info'
  title: string
  description: string
  metadata: Record<string, unknown>
  createdAt: string
}

type AlertsResponse = {
  alerts: Alert[]
  summary: {
    total: number
    critical: number
    warnings: number
    info: number
  }
}

async function generateAlerts(): Promise<AlertsResponse> {
  const alerts: Alert[] = []
  const now = new Date()

  // Check NCC keys (AiNccKey)
  const nccKeys = await db.aiNccKey.findMany({
    where: { status: { in: ['active', 'low_balance'] } },
    select: {
      id: true,
      nickname: true,
      remainingUsd: true,
      totalQuotaUsd: true,
    },
  })

  for (const key of nccKeys) {
    const remaining = Number(key.remainingUsd)
    const total = Number(key.totalQuotaUsd)
    
    if (remaining > 0 && total > 0) {
      const usagePct = ((total - remaining) / total) * 100

      if (usagePct >= 90) {
        alerts.push({
          id: `ncc-${key.id}-exhausted`,
          type: 'ncc_exhausted',
          severity: 'danger',
          title: 'NCC Key nearly exhausted',
          description: `Key "${key.nickname || key.id}" chỉ còn $${remaining.toFixed(2)} (${(100 - usagePct).toFixed(1)}% remaining)`,
          metadata: {
            remaining: `$${remaining.toFixed(2)}`,
            total: `$${total.toFixed(2)}`,
            used: `${usagePct.toFixed(1)}%`,
          },
          createdAt: now.toISOString(),
        })
      } else if (usagePct >= 75) {
        alerts.push({
          id: `ncc-${key.id}-low`,
          type: 'ncc_low_balance',
          severity: 'warning',
          title: 'NCC Key low balance',
          description: `Key "${key.nickname || key.id}" balance thấp: $${remaining.toFixed(2)}`,
          metadata: {
            remaining: `$${remaining.toFixed(2)}`,
            total: `$${total.toFixed(2)}`,
            used: `${usagePct.toFixed(1)}%`,
          },
          createdAt: now.toISOString(),
        })
      }
    } else if (remaining <= 0) {
      alerts.push({
        id: `ncc-${key.id}-exhausted`,
        type: 'ncc_exhausted',
        severity: 'danger',
        title: 'NCC Key exhausted',
        description: `Key "${key.nickname || key.id}" đã hết balance`,
        metadata: {
          remaining: '$0.00',
          total: `$${total.toFixed(2)}`,
        },
        createdAt: now.toISOString(),
      })
    }
  }

  // Check API keys over soft cap (from plan)
  const apiKeysOverSoftCap = await db.aiApiKey.findMany({
    where: { status: 'active' },
    include: {
      user: { select: { id: true, email: true, name: true } },
      plan: { select: { name: true, softCapTokens: true } },
    },
  })

  for (const apiKey of apiKeysOverSoftCap) {
    const softCap = apiKey.plan?.softCapTokens
    if (softCap && Number(softCap) > 0 && apiKey.quotaUsedTokens > softCap) {
      alerts.push({
        id: `apikey-${apiKey.id}-over`,
        type: 'api_key_over_soft_cap',
        severity: 'warning',
        title: 'API Key over soft cap',
        description: `Key "${apiKey.name}" của ${apiKey.user?.name || apiKey.user?.email} đã vượt soft cap`,
        metadata: {
          user: apiKey.user?.email ?? '',
          used: Number(apiKey.quotaUsedTokens).toLocaleString(),
          softCap: Number(softCap).toLocaleString(),
          plan: apiKey.plan?.name ?? '',
        },
        createdAt: now.toISOString(),
      })
    }
  }

  const severityOrder = { danger: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return {
    alerts,
    summary: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'danger').length,
      warnings: alerts.filter((a) => a.severity === 'warning').length,
      info: alerts.filter((a) => a.severity === 'info').length,
    },
  }
}

export default async function QuotaAlertsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/manage/login?next=/manage/ai/alerts')
  if (!['admin', 'super_admin'].includes(user.role)) redirect('/')

  const initialAlerts = await generateAlerts()

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <QuotaAlertsClient initialAlerts={serialize(initialAlerts)} />
    </div>
  )
}
