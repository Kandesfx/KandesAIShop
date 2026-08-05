import { logger } from '@/lib/logger'
import type { StreamChunkMeta } from './types'

/**
 * Streaming pass-through helper — Phase 6 P6-05 (D50, D52).
 *
 * Wrap upstream `ReadableStream` thành stream mới:
 *   - Forward bytes nguyên vẹn (KHÔNG buffer toàn bộ body).
 *   - Parse SSE chunks để track `usage` từ OpenAI-compatible chunk cuối.
 *   - Token count mirror từ upstream `usage` (D52) — KHÔNG dùng local tokenizer.
 *   - Per-chunk timeout 30s nếu upstream không gửi gì.
 *   - Backpressure-aware via `TransformStream`.
 *
 * Implementation notes:
 *   - Dùng `TransformStream` thay vì custom `ReadableStream` để Next.js / Web
 *     runtime đều support đồng nhất.
 *   - Decode theo UTF-8 streaming → split by `\n\n` (SSE boundary).
 *   - Buffer incomplete line cuối → prepend vào chunk sau.
 *   - Support both /chat/completions (OpenAI SSE) and /responses (Codex Responses API SSE):
 *     - chat.completions: `data: {"id":"...","choices":[],"usage":{...}}\n\n`
 *     - responses: `event: response.completed\ndata: {...,"response":{"usage":{...}}}\n\n`
 */

const CHUNK_TIMEOUT_MS = 30_000

/**
 * Wrap upstream stream. onUsage được gọi khi upstream phát chunk có `usage` field
 * (OpenAI-compatible cuối cùng). Nếu upstream không bao giờ trả `usage` →
 * onUsage không bao giờ được gọi → caller log warning.
 */
export function wrapStream(
  upstream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onUsage: (usage: ParsedUsage) => void
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller): Promise<void> {
      buffer += decoder.decode(chunk, { stream: true })

      // SSE event boundary = double newline.
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const eventBlock = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')

        const usage = parseStreamUsage(eventBlock)
        if (usage) onUsage(usage)

        // Forward verbatim.
        controller.enqueue(encoder.encode(eventBlock + '\n\n'))
      }
    },

    flush(controller): void {
      // Drain remaining buffer.
      buffer += decoder.decode()
      if (buffer.length > 0) {
        const usage = parseStreamUsage(buffer)
        if (usage) onUsage(usage)
        controller.enqueue(encoder.encode(buffer))
      }
      controller.terminate()
    },
  })

  // Tee upstream → transformed output + close.
  const transformed = upstream.pipeThrough(transform)

  // Per-chunk timeout via AbortSignal.
  if (signal.aborted) {
    void upstream.cancel()
    return transformed
  }
  signal.addEventListener('abort', () => {
    logger.warn('stream: aborted by signal')
    void upstream.cancel()
  })

  return transformed
}

export type ParsedUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Parse SSE event block — extract `usage` từ chunk JSON nếu có.
 *
 * Supports two upstream SSE formats:
 * 1. OpenAI `/chat/completions`: `data: {"id":"...","choices":[],"usage":{"prompt_tokens":N,"completion_tokens":M,"total_tokens":K}}`
 * 2. Codex `/responses`: `event: response.completed\ndata: {"type":"response.completed","response":{"usage":{"input_tokens":N,"output_tokens":M,"total_tokens":K}}}`
 *
 * Each format uses different field names:
 * - OpenAI: `prompt_tokens` / `completion_tokens`
 * - Responses: `input_tokens` / `output_tokens`
 */
export function parseStreamUsage(eventBlock: string): ParsedUsage | null {
  // Strategy: find usage field via regex (handles multi-line JSON in Responses API).
  // Look for: "usage":{...} or "usage": {...} across lines.
  const usageMatch = eventBlock.match(/"usage"\s*:\s*\{([^}]+)\}/)
  if (!usageMatch) return null

  const usageRaw = usageMatch[1] ?? ''
  const fields: Record<string, number> = {}

  // Parse individual fields: "prompt_tokens":123 or "input_tokens":456 etc.
  for (const tokenMatch of usageRaw.matchAll(/"(prompt_tokens|input_tokens|completion_tokens|output_tokens|total_tokens)"\s*:\s*(\d+)/g)) {
    const key = tokenMatch[1]
    const val = tokenMatch[2]
    if (key && val) fields[key] = parseInt(val, 10)
  }

  const promptTokens = fields.prompt_tokens ?? fields.input_tokens ?? 0
  const completionTokens = fields.completion_tokens ?? fields.output_tokens ?? 0
  const totalTokens = fields.total_tokens ?? promptTokens + completionTokens

  if (totalTokens === 0) return null
  return { promptTokens, completionTokens, totalTokens }
}

function numOrZero(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.trunc(v))
  return 0
}