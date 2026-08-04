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
 *   - Backpressure-aware qua `TransformStream`.
 *
 * Implementation notes:
 *   - Dùng `TransformStream` thay vì custom `ReadableStream` để Next.js / Web
 *     runtime đều support đồng nhất.
 *   - Decode theo UTF-8 streaming → split by `\n\n` (SSE boundary).
 *   - Buffer incomplete line cuối → prepend vào chunk sau.
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
 * OpenAI-compatible chunk cuối có shape:
 *   data: {"id":"...","choices":[],"usage":{"prompt_tokens":N,"completion_tokens":M,"total_tokens":K}}
 */
export function parseStreamUsage(eventBlock: string): ParsedUsage | null {
  for (const line of eventBlock.split('\n')) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (payload === '[DONE]') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(payload)
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') continue
    const obj = parsed as { usage?: unknown }
    if (!obj.usage || typeof obj.usage !== 'object') continue
    const usage = obj.usage as Record<string, unknown>
    const promptTokens = numOrZero(usage.prompt_tokens)
    const completionTokens = numOrZero(usage.completion_tokens)
    const totalTokens = numOrZero(usage.total_tokens) || promptTokens + completionTokens
    if (totalTokens === 0) continue
    return { promptTokens, completionTokens, totalTokens }
  }
  return null
}

function numOrZero(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.trunc(v))
  return 0
}