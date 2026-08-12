import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { resolveUpstreamBaseUrl, maskUpstreamUrl } from '../branding'
import { HOP_BY_HOP_HEADERS } from '../types'
import type { AiProviderImpl } from './base'
import type { ForwardRequest, ForwardResponse } from '../types'
import type { AiProvider as PrismaAiProvider } from '@prisma/client'

/**
 * Upstream (CC Pro) provider — Phase 6 P6-02 + Phase 7-RB (D53, D56, D57).
 *
 * Forward OpenAI-compatible requests/stream tới upstream NCC.
 * Tên class giữ `CcProProvider` để không phá import hiện có + test, nhưng
 * base URL đã move vào `branding.ts` và masked trong log output.
 *
 * Config:
 *   - baseUrl = `https://api.ccpro.cn/v1` (default qua branding.ts)
 *   - Override qua env `CCPRO_BASE_URL` hoặc AiProviderConfig.baseUrl.
 *
 * Phase 7-RB thêm:
 *   - `forwardGeneric(path)` cho cả `chat/completions` + `responses` (D56).
 *   - `getUsage()` cho cron balance sync (D57).
 */

const NON_STREAM_TIMEOUT_MS = 60_000

/** Singleton instance dùng cho standalone functions. */
const ccproInstance = new CcProProvider()

/**
 * Standalone function để list models từ NCC Pro.
 * Dùng cho endpoint `/api/ai/v1/models` với passthrough key.
 */
export async function listModelsFromCcPro(apiKey: string): Promise<NccModel[]> {
  return ccproInstance.listModels(apiKey)
}

export class CcProProvider implements AiProviderImpl {
  readonly name: PrismaAiProvider = 'ccpro'

  private getBaseUrl(override?: string): string {
    return override ?? env.CCPRO_BASE_URL ?? resolveUpstreamBaseUrl()
  }

  async forward(req: ForwardRequest): Promise<ForwardResponse> {
    return this.forwardGeneric(req, '/chat/completions')
  }

  async forwardStream(req: ForwardRequest): Promise<ReadableStream<Uint8Array>> {
    return this.forwardStreamGeneric(req, '/chat/completions')
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; message?: string }> {
    const url = this.getBaseUrl()
    const startedAt = Date.now()
    try {
      const resp = await fetch(`${url}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer test` },
        signal: AbortSignal.timeout(10_000),
      })
      const latencyMs = Date.now() - startedAt
      if (resp.status >= 500) {
        return { ok: false, latencyMs, message: `Upstream ${resp.status}` }
      }
      return { ok: true, latencyMs, message: `Upstream reachable (status ${resp.status})` }
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        message: `Network: ${(err as Error).message}`,
      }
    }
  }

  /**
   * Generic forward cho non-stream (D56). Dùng bởi chat/completions + responses.
   */
  async forwardGeneric(
    req: ForwardRequest,
    path: '/chat/completions' | '/responses'
  ): Promise<ForwardResponse> {
    const url = `${this.getBaseUrl(req.baseUrl)}${path}`
    const startedAt = Date.now()

    let resp: Response
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${req.apiKey}`,
        },
        body: JSON.stringify({ ...req.body, stream: false }),
        signal: AbortSignal.timeout(NON_STREAM_TIMEOUT_MS),
      })
    } catch (err) {
      logger.error(
        { err: (err as Error).message, url: maskUpstreamUrl(url) },
        'upstream: network error'
      )
      throw err
    }

    const latencyMs = Date.now() - startedAt
    const headers = mirrorHeaders(resp.headers)

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      logger.warn(
        { status: resp.status, latencyMs, err: errText.slice(0, 500) },
        'upstream: non-2xx response'
      )
    }

    let json: unknown = null
    try {
      json = await resp.json()
    } catch {
      json = null
    }

    return { status: resp.status, headers, json }
  }

  /**
   * Generic stream forward (D56). Cùng contract nhưng path configurable.
   */
  async forwardStreamGeneric(
    req: ForwardRequest,
    path: '/chat/completions' | '/responses'
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.getBaseUrl(req.baseUrl)}${path}`
    let resp: Response
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${req.apiKey}`,
        },
        body: JSON.stringify({ ...req.body, stream: true }),
        signal: req.signal,
      })
    } catch (err) {
      logger.error(
        { err: (err as Error).message, url: maskUpstreamUrl(url) },
        'upstream: stream network error'
      )
      throw err
    }

    if (!resp.ok || !resp.body) {
      const errText = await resp.text().catch(() => '')
      logger.warn(
        { status: resp.status, err: errText.slice(0, 500) },
        'upstream: stream non-2xx response'
      )
      throw new Error(`Upstream ${resp.status}: ${errText.slice(0, 200)}`)
    }

    return resp.body
  }

  /**
   * GET /v1/models — List available models cho NCC key.
   * Cache kết quả 5 phút để tránh spam upstream.
   */
  private modelsCache: { data: NccModel[]; expiresAt: number } | null = null
  private readonly MODELS_CACHE_TTL_MS = 5 * 60 * 1000

  async listModels(apiKey: string): Promise<NccModel[]> {
    // Check cache
    if (this.modelsCache && this.modelsCache.expiresAt > Date.now()) {
      return this.modelsCache.data
    }

    const url = `${this.getBaseUrl()}/models`
    const resp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      logger.warn({ status: resp.status, err: errText.slice(0, 500) }, 'upstream: listModels failed')
      throw new Error(`Upstream ${resp.status}: ${errText.slice(0, 200)}`)
    }

    const json = (await resp.json()) as { data: NccModel[] }
    // Cache kết quả
    this.modelsCache = {
      data: json.data,
      expiresAt: Date.now() + this.MODELS_CACHE_TTL_MS,
    }
    return json.data
  }

  /**
   * GET /v1/usage — NCC balance endpoint (D57).
   * Trả về quota usage + model stats.
   *
   * Endpoint này KHÔNG forward cho KH — chỉ admin/internal cron dùng.
   */
  async getUsage(apiKey: string, startDate?: string, endDate?: string): Promise<NccUsageResponse> {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const url = `${this.getBaseUrl()}/usage${queryString}`
    const startedAt = Date.now()
    const resp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    })
    const latencyMs = Date.now() - startedAt

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      logger.warn(
        { status: resp.status, latencyMs, err: errText.slice(0, 500) },
        'upstream: getUsage failed'
      )
      throw new Error(`Upstream ${resp.status}: ${errText.slice(0, 200)}`)
    }

    const json = (await resp.json()) as NccUsageResponse
    return json
  }
}

/**
 * NCC model item từ /v1/models endpoint.
 */
export type NccModel = {
  id: string
  type: string
  display_name: string
  created_at: string
}

/**
 * NCC usage response shape (live-verified 2026-08-05).
 * Schema reflects actual CC Pro `/v1/usage` response.
 */
export type NccUsageResponse = {
  /** Quick access — USD remaining at root level. */
  remaining: number
  /** USD total quota remaining (alias for quota.remaining). */
  quota?: {
    limit: number
    remaining: number
    used: number
    unit?: string
    reset_at?: string
  }
  /** Key expiration date. */
  expires_at?: string
  /** Whether key is valid. */
  isValid?: boolean
  /** Usage mode: quota_limited | time_limited | unlimited. */
  mode?: string
  /** Days until expiry. */
  days_until_expiry?: number
  /** Stats per model (for admin reporting). */
  model_stats?: Array<{
    model: string
    requests?: number
    input_tokens?: number
    output_tokens?: number
    cache_creation_tokens?: number
    cache_read_tokens?: number
    total_tokens?: number
    cost_usd?: number
    actual_cost?: number
    account_cost?: number
  }>
  /** Daily breakdown. */
  daily_usage?: Array<{
    date: string
    requests: number
    input_tokens: number
    output_tokens: number
    cache_read_tokens?: number
    cache_write_tokens?: number
    total_tokens: number
    cost: number
    actual_cost: number
  }>
  /** Generic usage stats. */
  usage?: {
    average_duration_ms?: number
    rpm?: number
    tpm?: number
    today?: unknown
    total?: unknown
  }
  /** Catch-all for unknown fields. */
  [key: string]: unknown
}

/** Forward headers từ upstream (exclude hop-by-hop). */
function mirrorHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return
    out[key.toLowerCase()] = value
  })
  return out
}