import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rateLimitOrThrow } from '@/lib/rate-limit'
import { ValidationError, UnauthorizedError } from '@/lib/errors'
import { db } from '@/lib/db'
import { sha256, constantTimeEqual } from '@/modules/ai-gateway/token'
import { CcProProvider } from '@/modules/ai-gateway/providers/ccpro'
import { serialize } from '@/lib/serialize'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/tools/key-checker — Comprehensive Key Usage & Analytics Checker.
 *
 * Tra cứu đầy đủ các chỉ số (Stats, Quota, Today, Total, Model Details breakdown)
 * từ hệ thống Kandes DB hoặc Upstream API (api.ccpro.cn/v1/usage).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Rate-limit per IP: 30 requests / minute
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'
    await rateLimitOrThrow(`key-checker:${ip}`, 30, 60_000)

    const body = await req.json().catch(() => null)
    const token = typeof body?.key === 'string' ? body.key.trim() : ''
    const timeRange = typeof body?.timeRange === 'string' ? body.timeRange : undefined
    const reqStartDate = typeof body?.startDate === 'string' ? body.startDate : undefined
    const reqEndDate = typeof body?.endDate === 'string' ? body.endDate : undefined

    if (!token || token.length < 8) {
      throw new ValidationError('Key không hợp lệ. Vui lòng nhập đầy đủ API key.')
    }

    // 1. Branch 1: Kandes system key (starts with 'ks-')
    if (token.startsWith('ks-') && token.length >= 16) {
      const keyPrefix = token.slice(0, 12)
      const apiKeyRow = await db.aiApiKey.findUnique({
        where: { keyPrefix },
        include: {
          plan: { select: { name: true, quotaTokens: true, softCapTokens: true } },
          nccKey: true,
        },
      })

      if (apiKeyRow) {
        const expectedHash = sha256(token)
        if (constantTimeEqual(expectedHash, apiKeyRow.keyHash)) {
          let status: 'active' | 'expired' | 'revoked' | 'suspended' = 'active'
          let statusMessage = 'Key đang hoạt động bình thường.'

          if (apiKeyRow.status === 'revoked') {
            status = 'revoked'
            statusMessage = 'Key đã bị thu hồi.'
          } else if (apiKeyRow.status === 'suspended') {
            status = 'suspended'
            statusMessage = 'Key đang bị tạm ngưng.'
          } else if (apiKeyRow.expiresAt && apiKeyRow.expiresAt.getTime() < Date.now()) {
            status = 'expired'
            statusMessage = 'Key đã hết hạn.'
          }

          const quotaUsed = Number(apiKeyRow.quotaUsedTokens)
          const quotaTotal = Number(apiKeyRow.plan.quotaTokens)
          const remaining = Math.max(0, quotaTotal - quotaUsed)
          const quotaPercent = quotaTotal > 0 ? Math.min(Math.round((quotaUsed / quotaTotal) * 100), 100) : 0

          return ok(
            serialize({
              isKandesKey: true,
              status,
              statusMessage,
              mode: apiKeyRow.plan.name,
              quota: {
                limit: quotaTotal,
                used: quotaUsed,
                remaining,
                percent: quotaPercent,
                unit: 'tokens',
              },
              keyDetails: {
                subscriptionType: apiKeyRow.plan.name,
                remainingQuota: `${quotaUsed.toLocaleString()} / ${quotaTotal.toLocaleString()} tokens`,
                expires: apiKeyRow.expiresAt ? apiKeyRow.expiresAt.toISOString() : null,
                daysUntilExpiry: apiKeyRow.expiresAt
                  ? Math.max(0, Math.ceil((apiKeyRow.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : null,
              },
              usageStats: {
                today: {
                  requests: 0,
                  inputTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
                  cacheWrite: 0,
                  cacheRead: 0,
                  cost: 0,
                },
                total: {
                  requests: 0,
                  inputTokens: quotaUsed,
                  outputTokens: 0,
                  totalTokens: quotaUsed,
                  cacheWrite: 0,
                  cacheRead: 0,
                  cost: 0,
                  avgDurationMs: 0,
                },
                rpm: 0,
                tpm: 0,
              },
              modelStats: [],
              keyName: apiKeyRow.name ?? `Key ${apiKeyRow.keyPrefix}...`,
              createdAt: apiKeyRow.createdAt,
              expiresAt: apiKeyRow.expiresAt,
              lastUsedAt: apiKeyRow.lastUsedAt,
            })
          )
        }
      }
    }

    // 2. Branch 2: Upstream / Reseller Key (sk-xxx, sk-jy-cx-xxx, ccpro-xxx...)
    try {
      const provider = new CcProProvider()
      let sDate = reqStartDate
      let eDate = reqEndDate

      if (!sDate && timeRange) {
        const todayStr = new Date().toISOString().split('T')[0]
        if (timeRange === 'today') {
          sDate = todayStr
          eDate = todayStr
        } else if (timeRange === '7days') {
          const d = new Date()
          d.setDate(d.getDate() - 7)
          sDate = d.toISOString().split('T')[0]
          eDate = todayStr
        } else if (timeRange === '30days') {
          const d = new Date()
          d.setDate(d.getDate() - 30)
          sDate = d.toISOString().split('T')[0]
          eDate = todayStr
        }
      }

      const usageData = await provider.getUsage(token, sDate, eDate)

      if (usageData) {
        const isValid = usageData.isValid !== false
        const remaining = Number(usageData.remaining ?? usageData.quota?.remaining ?? 0)
        const limit = Number(usageData.quota?.limit ?? 0)
        const used = Number(usageData.quota?.used ?? (limit > remaining ? limit - remaining : 0))
        const total = limit > 0 ? limit : used + remaining
        const percent = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0

        const status: 'active' | 'expired' | 'revoked' | 'suspended' = isValid
          ? remaining > 0 || total === 0
            ? 'active'
            : 'expired'
          : 'revoked'

        const statusMessage =
          status === 'active'
            ? 'Tài khoản active, hạn ngạch còn khả dụng.'
            : status === 'expired'
              ? 'Tài khoản đã dùng hết hạn ngạch (quota exhausted).'
              : 'Tài khoản bị vô hiệu hóa hoặc không khả dụng.'

        const todayObj = (usageData.usage?.today ?? {}) as Record<string, number>
        const totalObj = (usageData.usage?.total ?? {}) as Record<string, number>

        return ok(
          serialize({
            isKandesKey: false,
            status,
            statusMessage,
            mode: usageData.mode ?? 'Quota mode',
            daysUntilExpiry: usageData.days_until_expiry ?? null,
            expiresAt: usageData.expires_at ?? null,
            quota: {
              limit: parseFloat(total.toFixed(4)),
              used: parseFloat(used.toFixed(4)),
              remaining: parseFloat(remaining.toFixed(4)),
              percent,
              unit: usageData.quota?.unit ?? usageData.unit ?? 'USD',
            },
            keyDetails: {
              subscriptionType: usageData.mode ? `${usageData.mode.replace(/_/g, ' ')}` : 'Quota mode',
              remainingQuota: `$${remaining.toFixed(2)}`,
              expires: usageData.expires_at ?? null,
              daysUntilExpiry: usageData.days_until_expiry ?? null,
            },
            usageStats: {
              today: {
                requests: Number(todayObj.requests ?? 0),
                inputTokens: Number(todayObj.input_tokens ?? 0),
                outputTokens: Number(todayObj.output_tokens ?? 0),
                totalTokens: Number(todayObj.total_tokens ?? 0),
                cacheWrite: Number(todayObj.cache_creation_tokens ?? 0),
                cacheRead: Number(todayObj.cache_read_tokens ?? 0),
                cost: Number(todayObj.cost ?? todayObj.actual_cost ?? 0),
              },
              total: {
                requests: Number(totalObj.requests ?? 0),
                inputTokens: Number(totalObj.input_tokens ?? 0),
                outputTokens: Number(totalObj.output_tokens ?? 0),
                totalTokens: Number(totalObj.total_tokens ?? 0),
                cacheWrite: Number(totalObj.cache_creation_tokens ?? 0),
                cacheRead: Number(totalObj.cache_read_tokens ?? 0),
                cost: Number(totalObj.cost ?? totalObj.actual_cost ?? 0),
                avgDurationMs: Math.round(Number(usageData.usage?.average_duration_ms ?? 0)),
              },
              rpm: Number(usageData.usage?.rpm ?? 0),
              tpm: Number(usageData.usage?.tpm ?? 0),
            },
            modelStats: (usageData.model_stats ?? []).map((m) => {
              const item = m as unknown as Record<string, number>
              return {
                model: m.model,
                requests: Number(m.requests ?? 0),
                inputTokens: Number(m.input_tokens ?? 0),
                outputTokens: Number(m.output_tokens ?? 0),
                cacheWrite: Number(m.cache_creation_tokens ?? 0),
                cacheRead: Number(m.cache_read_tokens ?? 0),
                totalTokens: Number(m.total_tokens ?? 0),
                cost: Number(item.cost ?? item.cost_usd ?? item.actual_cost ?? 0),
              }
            }),
            dailyUsage: usageData.daily_usage ?? [],
            keyName: `Key ${token.slice(0, 10)}...${token.slice(-4)}`,
          })
        )
      }
    } catch (upstreamErr) {
      logger.warn({ err: (upstreamErr as Error).message }, 'key-checker: upstream lookup error')
    }

    await new Promise((r) => setTimeout(r, 100))
    throw new UnauthorizedError('API key không tồn tại, không hợp lệ hoặc đã bị vô hiệu hóa.')
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'tools/key-checker error')
    return fail(err, req)
  }
}
