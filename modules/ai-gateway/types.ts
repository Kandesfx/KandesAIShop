import type { AiProvider } from '@prisma/client'

/**
 * AI Gateway shared types — Phase 6.
 *
 * Spec: docs/tasks/PHASE_6_AI_GATEWAY.md
 * Deviations: D46..D52 (locked 2026-08-05).
 */

export type AiProviderName = AiProvider

/** Forward context: provider-bound NCC API key + parsed request body. */
export type ForwardRequest = {
  /** Resolved provider name (ccpro/openai/anthropic). */
  provider: AiProviderName
  /** Plaintext API key to authenticate with upstream. */
  apiKey: string
  /** OpenAI-compatible request body (validated externally). */
  body: ChatCompletionRequest
  /** AbortSignal for cancellation/timeout. */
  signal: AbortSignal
  /** Optional base URL override (per-provider config). */
  baseUrl?: string
}

export type ForwardResponse = {
  /** HTTP status code from upstream. */
  status: number
  /** Headers to mirror back to client (excluding hop-by-hop). */
  headers: Record<string, string>
  /** Parsed JSON body (non-stream) OR null for stream path. */
  json: unknown | null
}

/** OpenAI-compatible chat completions request shape (top-level only). */
export type ChatCompletionRequest = {
  model: string
  messages: Array<{ role: string; content?: unknown }>
  stream?: boolean
  temperature?: number
  top_p?: number
  max_tokens?: number
  // Other fields passed-through verbatim to upstream.
  [key: string]: unknown
}

/** Resolved authentication context cho request sau khi xác thực thành công. */
export type AuthContext = {
  apiKey: {
    id: string
    userId: string
    planId: string
    nccKeyId: string | null
    source: 'kandes_purchased' | 'user_provided'
    expiresAt: Date | null
    quotaUsedTokens: bigint
  }
  user: {
    id: string
    email: string | null
    role: string
  }
  plan: {
    id: string
    name: string
    slug: string
    rateLimitPerMinute: number
    quotaTokens: bigint
    softCapTokens: bigint | null
  }
  /** Resolved upstream API key (NCC pool hoặc KH-provided). */
  upstreamApiKey: string
  /** Resolved provider name. */
  provider: AiProviderName
}

export type StreamChunkMeta = {
  /** Bytes forwarded to client. */
  bytes: number
  /** Cumulative tokens counted từ upstream `usage` field nếu có. */
  totalTokens: number | null
  /** True nếu chunk cuối (stream done). */
  done: boolean
}

export type ModelAliasEntry = {
  /** Public-facing alias KH nhìn thấy + sử dụng. */
  alias: string
  /** Upstream model name forward tới NCC. */
  upstream: string
  /** Human-friendly model family cho pricing/UI. */
  family: 'gpt-4o' | 'claude-sonnet' | 'gemini-flash' | 'deepseek'
}

/** In-memory circuit breaker state. */
export type CircuitState = 'closed' | 'open' | 'half-open'

export type NccKeyView = {
  id: string
  provider: AiProviderName
  totalQuotaUsd: number
  remainingUsd: number
  nickname: string | null
  status: 'active' | 'low_balance' | 'exhausted' | 'disabled'
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type NccKeyCreateInput = {
  provider: AiProviderName
  /** Plaintext NCC API key — sẽ encrypt trước khi lưu DB. */
  apiKey: string
  totalQuotaUsd: number
  nickname?: string
}

/** Pricing per 1K tokens (USD). */
export type PricingEntry = {
  family: ModelAliasEntry['family']
  inputPer1k: number
  outputPer1k: number
}

/**
 * Hop-by-hop headers KHÔNG mirror từ upstream khi forward stream.
 * Theo RFC 7230 §6.1.
 */
export const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
])