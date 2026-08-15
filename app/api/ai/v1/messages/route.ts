import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/http'
import { rateLimitOrThrow } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { authenticateApiKey } from '@/modules/ai-gateway/auth'
import { resolveModelAlias } from '@/modules/ai-gateway/models'
import { recordQuotaUsage } from '@/modules/ai-gateway/quota'
import { recordSuccess, recordFailure } from '@/modules/ai-gateway/failover'
import { getProvider } from '@/modules/ai-gateway/providers'
import { db } from '@/lib/db'
import {
  anthropicToOpenAI,
  openAIToAnthropic,
  openAIToAnthropicStream,
  openAIErrorToAnthropic,
  AnthropicAdapterError,
  type AnthropicMessagesRequest,
} from '@/modules/ai-gateway/anthropic-adapter'
import type { ChatCompletionRequest } from '@/modules/ai-gateway/types'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/v1/messages
 *
 * Anthropic Messages API endpoint â€” adapter cho Claude Code CLI.
 *
 * Convert Anthropic Messages request â†’ OpenAI Chat Completions,
 * forward qua NCC upstream, sau Ä‘Ã³ convert response ngÆ°á»£c láº¡i
 * Anthropic Messages format (non-stream + SSE stream).
 *
 * Auth: Bearer `ks-...` (Kandes) hoáº·c `sk-jy-cx-...` / `sk-jy-cc-...` (passthrough NCC).
 */
export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()

  // Rate-limit IP (probe protection)
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(`ai:ip:${ip ?? 'unknown'}`, 600, 60_000).catch(() => {})
  } catch {
    // best-effort
  }

  // 1. Parse body
  let body: AnthropicMessagesRequest
  try {
    const raw = (await req.json()) as unknown
    body = validateAnthropicRequest(raw)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request body'
    return anthropicErrorResponse(400, 'invalid_request_error', message)
  }

  // 2. Auth
  let ctx
  try {
    ctx = await authenticateApiKey(req)
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 401
    const message = (err as Error).message ?? 'Unauthorized'
    const type =
      status === 401
        ? 'authentication_error'
        : status === 403
        ? 'permission_error'
        : 'api_error'
    return anthropicErrorResponse(status, type, message)
  }

  // 3. Convert body to OpenAI format + resolve model alias
  let openaiBody: ChatCompletionRequest
  try {
    openaiBody = anthropicToOpenAI(body)
    const alias = resolveModelAlias(openaiBody.model)
    openaiBody = { ...openaiBody, model: alias.upstream }
  } catch (err) {
    if (err instanceof AnthropicAdapterError) {
      return anthropicErrorResponse(err.status, err.type, err.message)
    }
    return anthropicErrorResponse(400, 'invalid_request_error', (err as Error).message)
  }

  // 4. Forward
  const provider = getProvider(ctx.provider)
  const forwardSignal = AbortSignal.timeout(60_000)
  const forwardReq: import('@/modules/ai-gateway/types').ForwardRequest = {
    provider: ctx.provider,
    apiKey: ctx.upstreamApiKey,
    body: openaiBody,
    signal: forwardSignal,
  }

  const family = resolveModelAlias(body.model).family

  if (body.stream) {
    return handleAnthropicStream(ctx, provider, forwardReq, body.model, family, requestId, startedAt)
  }
  return handleAnthropicNonStream(
    ctx,
    provider,
    forwardReq,
    body.model,
    family,
    requestId,
    startedAt
  )
}

// === Non-stream ===

async function handleAnthropicNonStream(
  ctx: Awaited<ReturnType<typeof authenticateApiKey>>,
  provider: ReturnType<typeof getProvider>,
  req: import('@/modules/ai-gateway/types').ForwardRequest,
  originalModel: string,
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
  requestId: string,
  startedAt: number
): Promise<Response> {
  try {
    const upstream = await provider.forward(req)
    const latencyMs = Date.now() - startedAt

    if (upstream.status >= 400) {
      recordFailure(ctx.provider, new Error(`upstream ${upstream.status}`))
      const { type, message } = openAIErrorToAnthropic(
        upstream.status,
        (upstream.json as Record<string, unknown> | null) ?? null
      )
      logger.warn(
        { requestId, apiKeyId: ctx.apiKey.id, status: upstream.status, latencyMs },
        'anthropic-messages: upstream error'
      )
      return anthropicErrorResponse(upstream.status, 'invalid_request_error', 'Upstream Error: ' + message)
    }

    recordSuccess(ctx.provider)
    const anthropicResp = openAIToAnthropic(
      (upstream.json as Record<string, unknown>) ?? {},
      originalModel
    )

    // Log usage
    logUsage({
      requestId,
      apiKeyId: ctx.apiKey.id,
      userId: ctx.apiKey.userId,
      provider: ctx.provider,
      model: req.body.model,
      promptTokens: anthropicResp.usage.input_tokens,
      completionTokens: anthropicResp.usage.output_tokens,
      latencyMs,
      family,
    })
    recordQuotaUsage(
      ctx,
      anthropicResp.usage.input_tokens + anthropicResp.usage.output_tokens
    )

    return new Response(JSON.stringify(anthropicResp), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...upstream.headers },
    })
  } catch (err) {
    recordFailure(ctx.provider, err as Error)
    logger.error(
      { err: (err as Error).message, requestId, apiKeyId: ctx.apiKey.id },
      'anthropic-messages: non-stream forward failed'
    )
    return anthropicErrorResponse(502, 'api_error', (err as Error).message)
  }
}

// === Stream ===

async function handleAnthropicStream(
  ctx: Awaited<ReturnType<typeof authenticateApiKey>>,
  provider: ReturnType<typeof getProvider>,
  req: import('@/modules/ai-gateway/types').ForwardRequest,
  originalModel: string,
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
  requestId: string,
  startedAt: number
): Promise<Response> {
  let upstream: ReadableStream<Uint8Array>
  try {
    upstream = await provider.forwardStream(req)
  } catch (err) {
    recordFailure(ctx.provider, err as Error)
    logger.error(
      { err: (err as Error).message, requestId, apiKeyId: ctx.apiKey.id },
      'anthropic-messages: stream forward failed'
    )
    return anthropicErrorResponse(502, 'api_error', (err as Error).message)
  }

  recordSuccess(ctx.provider)

  const abortController = new AbortController()
  req.signal.addEventListener('abort', () => abortController.abort())

  let finalUsage: { input_tokens: number; output_tokens: number } | null = null

  const transformed = openAIToAnthropicStream(
    upstream,
    abortController.signal,
    (usage) => {
      finalUsage = usage
    }
  )

  void transformed
    .pipeTo(new WritableStream({ write() {}, close() {} }))
    .catch(() => {})
    .finally(() => {
      const latencyMs = Date.now() - startedAt
      const inputTokens = finalUsage?.input_tokens ?? 0
      const outputTokens = finalUsage?.output_tokens ?? 0
      logUsage({
        requestId,
        apiKeyId: ctx.apiKey.id,
        userId: ctx.apiKey.userId,
        provider: ctx.provider,
        model: req.body.model,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        latencyMs,
        family,
      })
      recordQuotaUsage(ctx, inputTokens + outputTokens)
    })

  return new Response(transformed, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

// === Helpers ===

function anthropicErrorResponse(status: number, type: string, message: string): NextResponse {
  return new NextResponse(
    JSON.stringify({ type, error: { type, message } }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

function validateAnthropicRequest(raw: unknown): AnthropicMessagesRequest {
  if (!raw || typeof raw !== 'object') {
    throw new AnthropicAdapterError('Request body must be a JSON object')
  }
  const obj = raw as Record<string, unknown>

  if (typeof obj.model !== 'string' || obj.model.length === 0) {
    throw new AnthropicAdapterError('`model` is required and must be a string')
  }

  if (!Array.isArray(obj.messages) || obj.messages.length === 0) {
    throw new AnthropicAdapterError('`messages` is required and must be a non-empty array')
  }

  if (typeof obj.max_tokens !== 'number' || obj.max_tokens <= 0) {
    throw new AnthropicAdapterError('`max_tokens` is required and must be a positive integer')
  }

  // Sanitize each message
  const messages = obj.messages.map((m: unknown, i: number) => {
    if (!m || typeof m !== 'object') {
      throw new AnthropicAdapterError(`messages[${i}] must be an object`)
    }
    const msg = m as Record<string, unknown>
    if (typeof msg.role !== 'string') {
      throw new AnthropicAdapterError(`messages[${i}].role must be a string`)
    }
    if (typeof msg.content !== 'string' && !Array.isArray(msg.content)) {
      throw new AnthropicAdapterError(
        `messages[${i}].content must be a string or array of content blocks`
      )
    }
    return msg as unknown as AnthropicMessagesRequest['messages'][number]
  })

  // System
  let system: AnthropicMessagesRequest['system']
  if (obj.system !== undefined) {
    if (typeof obj.system === 'string') {
      system = obj.system
    } else if (Array.isArray(obj.system)) {
      system = obj.system as AnthropicMessagesRequest['system']
    } else {
      throw new AnthropicAdapterError('`system` must be a string or array of text blocks')
    }
  }

  return {
    model: obj.model,
    messages,
    system,
    max_tokens: obj.max_tokens,
    temperature: typeof obj.temperature === 'number' ? obj.temperature : undefined,
    top_p: typeof obj.top_p === 'number' ? obj.top_p : undefined,
    stop_sequences: Array.isArray(obj.stop_sequences)
      ? (obj.stop_sequences as string[])
      : undefined,
    stream: obj.stream === true,
    tools: Array.isArray(obj.tools)
      ? (obj.tools as AnthropicMessagesRequest['tools'])
      : undefined,
    tool_choice: obj.tool_choice as AnthropicMessagesRequest['tool_choice'],
    metadata: obj.metadata as AnthropicMessagesRequest['metadata'],
  }
}

type LogUsageInput = {
  requestId: string
  apiKeyId: string
  userId: string
  provider: string
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
}

function logUsage(input: LogUsageInput): void {
  // Passthrough keys (id='passthrough') â€” skip DB logging
  if (input.apiKeyId === 'passthrough') return
  void db.aiUsage
    .create({
      data: {
        requestId: input.requestId,
        apiKeyId: input.apiKeyId,
        userId: input.userId,
        provider: input.provider as import('@prisma/client').AiProvider,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.promptTokens + input.completionTokens,
        costUsd: null,
        upstreamCostUsd: null,
        latencyMs: input.latencyMs,
      },
    })
    .catch((err) => {
      logger.error(
        { err: (err as Error).message, requestId: input.requestId },
        'anthropic-messages: failed to log usage (non-fatal)'
      )
    })
}


