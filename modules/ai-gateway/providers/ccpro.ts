import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { HOP_BY_HOP_HEADERS } from '../types'
import type { AiProviderImpl } from './base'
import type { ForwardRequest, ForwardResponse } from '../types'
import type { AiProvider as PrismaAiProvider } from '@prisma/client'

/**
 * CC Pro provider — Phase 6 P6-02.
 *
 * Forward OpenAI-compatible requests/stream tới CC Pro (`api.ccpro.cn/v1`).
 *
 * Config:
 *   - baseUrl = `https://api.ccpro.cn/v1` (default) — Phase 6 hard-code.
 *   - Phase 7+ cho override qua env `CCPRO_BASE_URL` hoặc AiProviderConfig.baseUrl.
 *
 * Khác biệt vs Phase 6 generic provider:
 *   - KHÔNG validate inner body — pass-through verbatim.
 *   - Forward response body cho non-stream, forward stream cho stream.
 *   - Mask `Authorization` header khi log.
 */

const DEFAULT_BASE_URL = 'https://api.ccpro.cn/v1'
const NON_STREAM_TIMEOUT_MS = 60_000

export class CcProProvider implements AiProviderImpl {
  readonly name: PrismaAiProvider = 'ccpro'

  private getBaseUrl(override?: string): string {
    return override ?? env.CCPRO_BASE_URL ?? DEFAULT_BASE_URL
  }

  async forward(req: ForwardRequest): Promise<ForwardResponse> {
    const url = `${this.getBaseUrl(req.baseUrl)}/chat/completions`
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
        { err: (err as Error).message, url: maskUrl(url) },
        'ccpro: network error'
      )
      throw err
    }

    const latencyMs = Date.now() - startedAt
    const headers = mirrorHeaders(resp.headers)

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      logger.warn(
        { status: resp.status, latencyMs, err: errText.slice(0, 500) },
        'ccpro: non-2xx response'
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

  async forwardStream(req: ForwardRequest): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.getBaseUrl(req.baseUrl)}/chat/completions`
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
        { err: (err as Error).message, url: maskUrl(url) },
        'ccpro: stream network error'
      )
      throw err
    }

    if (!resp.ok || !resp.body) {
      const errText = await resp.text().catch(() => '')
      logger.warn(
        { status: resp.status, err: errText.slice(0, 500) },
        'ccpro: stream non-2xx response'
      )
      throw new Error(`Upstream ${resp.status}: ${errText.slice(0, 200)}`)
    }

    return resp.body
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; message?: string }> {
    const url = this.getBaseUrl()
    const startedAt = Date.now()
    try {
      // CC Pro không có endpoint "ping" public — dùng models list (OpenAI-compatible).
      const resp = await fetch(`${url}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer test` },
        signal: AbortSignal.timeout(10_000),
      })
      const latencyMs = Date.now() - startedAt
      // 401 cũng tính là reachable — chỉ fail khi network/DNS/5xx.
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

function maskUrl(url: string): string {
  return url.replace(/\/\/[^/]+/, '//***')
}