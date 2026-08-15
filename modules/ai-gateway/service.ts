import crypto from 'crypto'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getProvider } from './providers'
import { checkRateLimit, checkSoftCap, recordQuotaUsage } from './quota'
import { resolveModelAlias } from './models'
import { calculateCost } from './cost'
import { wrapStream, parseStreamUsage } from './stream'
import { recordSuccess, recordFailure } from './failover'
import { authenticateApiKey } from './auth'
import type {
  AuthContext,
  ChatCompletionRequest,
  ForwardRequest,
  ForwardResponse,
} from './types'

/**
 * AI Gateway service — Phase 6 P6-04 + P6-05.
 *
 * Orchestrator:
 *   1. Authenticate Bearer → AuthContext (auth.ts).
 *   2. Rate-limit per plan (quota.ts).
 *   3. Soft cap warn (quota.ts).
 *   4. Resolve model alias.
 *   5. Provider forward (ccpro pass-through).
 *   6. Log usage async → AiUsage (D46: costUsd nullable, upstreamCostUsd mirror).
 *
 * Stream path:
 *   - Wrap upstream stream qua stream.ts (D50).
 *   - Track usage từ upstream `usage` field (D52).
 *   - Log usage sau khi stream complete.
 */

export type HandleChatOptions = {
  requestId?: string
}

/**
 * Phase 7-RB (D56): OpenAI Responses API entry — cho Codex CLI.
 * `body` chứa raw `input` thay vì `messages`.
 * KHÔNG alias resolution — KH đã gửi raw upstream model name.
 */
export type ResponsesBody = {
  model: string
  input: unknown
  stream?: boolean
  temperature?: number
  top_p?: number
  max_tokens?: number
  instructions?: string
  [key: string]: unknown
}

/** Main entry — gọi từ route handler `/api/ai/v1/chat/completions`. */
export async function handleChatCompletion(
  req: Request,
  body: ChatCompletionRequest,
  opts: HandleChatOptions = {}
): Promise<Response> {
  const requestId = opts.requestId ?? crypto.randomUUID()
  const startedAt = Date.now()

  // 1. Auth
  const ctx = await authenticateApiKey(req)

  // 2. Rate-limit (cứng — 429 nếu vượt)
  await checkRateLimit(ctx)

  // 3. Soft cap (D47 — chỉ warn, không reject)
  await checkSoftCap(ctx)

  // 4. Resolve model alias
  const alias = resolveModelAlias(body.model)
  const upstreamBody: ChatCompletionRequest = { ...body, model: alias.upstream }

  // 5. Forward
  const provider = getProvider(ctx.provider)
  const forwardReq: ForwardRequest = {
    provider: ctx.provider,
    apiKey: ctx.upstreamApiKey,
    body: upstreamBody,
    signal: AbortSignal.timeout(60_000),
  }

  if (body.stream) {
    return handleStream(ctx, forwardReq, provider, requestId, startedAt, alias.family)
  }
  return handleNonStream(ctx, forwardReq, provider, requestId, startedAt, alias.family)
}

/**
 * Handle OpenAI Responses API (Codex CLI) — Phase 7-RB (D56).
 * Flow giống chat/completions nhưng:
 *   - Forward tới upstream `/v1/responses` thay vì `/v1/chat/completions`.
 *   - KHÔNG alias resolve — KH đã gửi raw upstream model.
 *   - Stream path dùng `wrapStream` giống chat/completions (SSE format tương đương).
 */
export async function handleResponses(
  req: Request,
  body: ResponsesBody,
  opts: HandleChatOptions = {}
): Promise<Response> {
  const requestId = opts.requestId ?? crypto.randomUUID()
  const startedAt = Date.now()

  // 1. Auth
  const ctx = await authenticateApiKey(req)

  // 2. Rate-limit
  await checkRateLimit(ctx)

  // 3. Soft cap
  await checkSoftCap(ctx)

  // 4. Pass-through model — KH đã gửi raw upstream name.
  const forwardReq: ForwardRequest = {
    provider: ctx.provider,
    apiKey: ctx.upstreamApiKey,
    body: body as unknown as ChatCompletionRequest,
    signal: AbortSignal.timeout(60_000),
  }

  // 5. Family heuristic cho cost dashboard (KHÔNG alias).
  const family = resolveModelAlias(body.model).family
  const provider = getProvider(ctx.provider)

  if (body.stream) {
    return handleStream(ctx, forwardReq, provider, requestId, startedAt, family, '/responses')
  }
  return handleNonStream(ctx, forwardReq, provider, requestId, startedAt, family, '/responses')
}

async function handleNonStream(
  ctx: AuthContext,
  req: ForwardRequest,
  provider: ReturnType<typeof getProvider>,
  requestId: string,
  startedAt: number,
  family:
    | 'gpt-codex'
    | 'gpt-codex-mini'
    | 'gpt-pro'
    | 'claude-sonnet'
    | 'claude-sonnet-pro'
    | 'claude-opus'
    | 'claude-haiku'
    | 'gpt-4o'
    | 'gemini-flash'
    | 'deepseek',
  path: '/chat/completions' | '/responses' = '/chat/completions'
): Promise<Response> {
  try {
    const upstream: ForwardResponse = await provider.forward(req, path)
    const latencyMs = Date.now() - startedAt

    if (upstream.status >= 400) {
      recordFailure(ctx.provider, new Error(`upstream ${upstream.status}`))
      logger.warn(
        { requestId, apiKeyId: ctx.apiKey.id, status: upstream.status, latencyMs },
        'ai-gateway: upstream error'
      )
      return new Response(JSON.stringify(upstream.json ?? { error: 'upstream error' }), {
        status: upstream.status,
        headers: {
          'Content-Type': 'application/json',
          ...upstream.headers,
        },
      })
    }

    recordSuccess(ctx.provider)

    // Extract usage
    const usage = extractUsage(upstream.json)
    if (usage) {
      logUsage({
        requestId,
        apiKeyId: ctx.apiKey.id,
        userId: ctx.apiKey.userId,
        provider: ctx.provider,
        model: req.body.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        latencyMs,
        family,
        upstreamCostUsd: usage.upstreamCostUsd ?? null,
      })
      recordQuotaUsage(ctx, usage.totalTokens)
    } else {
      logger.warn(
        { requestId, apiKeyId: ctx.apiKey.id },
        'ai-gateway: no usage in upstream response (non-stream)'
      )
    }

    return new Response(JSON.stringify(upstream.json), {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        ...upstream.headers,
      },
    })
  } catch (err) {
    recordFailure(ctx.provider, err as Error)
    logger.error(
      { err: (err as Error).message, requestId, apiKeyId: ctx.apiKey.id },
      'ai-gateway: non-stream forward failed'
    )
    return new Response(
      JSON.stringify({ ok: false, error: { code: 'UPSTREAM_ERROR', message: (err as Error).message } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function handleStream(
  ctx: AuthContext,
  req: ForwardRequest,
  provider: ReturnType<typeof getProvider>,
  requestId: string,
  startedAt: number,
  family:
    | 'gpt-codex'
    | 'gpt-codex-mini'
    | 'gpt-pro'
    | 'claude-sonnet'
    | 'claude-sonnet-pro'
    | 'claude-opus'
    | 'claude-haiku'
    | 'gpt-4o'
    | 'gemini-flash'
    | 'deepseek',
  path: '/chat/completions' | '/responses' = '/chat/completions'
): Promise<Response> {
  let upstreamStream: ReadableStream<Uint8Array>
  try {
    upstreamStream = await provider.forwardStream(req, path)
  } catch (err) {
    recordFailure(ctx.provider, err as Error)
    logger.error(
      { err: (err as Error).message, requestId, apiKeyId: ctx.apiKey.id },
      'ai-gateway: stream forward failed'
    )
    return new Response(
      JSON.stringify({ ok: false, error: { code: 'UPSTREAM_ERROR', message: (err as Error).message } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  recordSuccess(ctx.provider)

  const abortController = new AbortController()
  req.signal.addEventListener('abort', () => abortController.abort())

  let finalUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null =
    null

  const wrapped = wrapStream(upstreamStream, abortController.signal, (usage) => {
    finalUsage = usage
  })

  // Log usage khi stream complete.
  wrapped
    .pipeTo(new WritableStream({ write() {}, close() {} }))
    .catch(() => {
      // swallow — abort là kết thúc bình thường
    })
    .finally(() => {
      const latencyMs = Date.now() - startedAt
      if (finalUsage) {
        logUsage({
          requestId,
          apiKeyId: ctx.apiKey.id,
          userId: ctx.apiKey.userId,
          provider: ctx.provider,
          model: req.body.model,
          promptTokens: finalUsage.promptTokens,
          completionTokens: finalUsage.completionTokens,
          latencyMs,
          family,
          upstreamCostUsd: null,
        })
        recordQuotaUsage(ctx, finalUsage.totalTokens)
      } else {
        logger.warn(
          { requestId, apiKeyId: ctx.apiKey.id, latencyMs },
          'ai-gateway: stream done but no usage chunk — upstream may not emit usage'
        )
        logUsage({
          requestId,
          apiKeyId: ctx.apiKey.id,
          userId: ctx.apiKey.userId,
          provider: ctx.provider,
          model: req.body.model,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs,
          family,
          upstreamCostUsd: null,
        })
      }
    })

  return new Response(wrapped, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

// === Usage logging ===

type LogUsageInput = {
  requestId: string
  apiKeyId: string
  userId: string
  provider: AuthContext['provider']
  model: string
  promptTokens: number
  completionTokens: number
  latencyMs: number
  family:
    | 'gpt-codex'
    | 'gpt-codex-mini'
    | 'gpt-pro'
    | 'claude-sonnet'
    | 'claude-sonnet-pro'
    | 'claude-opus'
    | 'claude-haiku'
    | 'gpt-4o'
    | 'gemini-flash'
    | 'deepseek'
  upstreamCostUsd: number | null
}

function logUsage(input: LogUsageInput): void {
  void db.aiUsage
    .create({
      data: {
        requestId: input.requestId,
        apiKeyId: input.apiKeyId,
        userId: input.userId,
        provider: input.provider,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.promptTokens + input.completionTokens,
        // costUsd nullable (D46) — Kandes reseller model không charge theo cost này.
        costUsd: null,
        upstreamCostUsd: input.upstreamCostUsd,
        latencyMs: input.latencyMs,
      },
    })
    .catch((err) => {
      logger.error(
        { err: (err as Error).message, requestId: input.requestId },
        'ai-gateway: failed to log usage (non-fatal)'
      )
    })
}

function extractUsage(json: unknown): {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  upstreamCostUsd?: number
} | null {
  if (!json || typeof json !== 'object') return null
  const obj = json as { usage?: unknown }
  if (!obj.usage || typeof obj.usage !== 'object') return null
  const u = obj.usage as Record<string, unknown>
  // Support both OpenAI (/chat/completions) and NCC Responses API field names.
  const promptTokens = numOrZero(u.prompt_tokens ?? u.input_tokens)
  const completionTokens = numOrZero(u.completion_tokens ?? u.output_tokens)
  const totalTokens = numOrZero(u.total_tokens) || promptTokens + completionTokens
  if (totalTokens === 0) return null
  return { promptTokens, completionTokens, totalTokens }
}

function numOrZero(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.trunc(v))
  return 0
}

export const aiGatewayService = {
  handleChatCompletion,
  handleResponses,
  extractUsage,
  parseStreamUsage,
  calculateCost,
}