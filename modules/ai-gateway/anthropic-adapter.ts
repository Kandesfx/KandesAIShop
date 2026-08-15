import { logger } from '@/lib/logger'
import type { ChatCompletionRequest } from './types'

/**
 * Anthropic Messages API ↔ OpenAI Chat Completions adapter.
 *
 * Mục đích: cho phép khách dùng Claude Code CLI gọi `POST /v1/messages` tới
 * `https://api.kandes.shop/v1/messages`, gateway sẽ:
 *   1. Parse body theo Anthropic Messages schema.
 *   2. Convert → OpenAI Chat Completions request (NCC upstream là OpenAI-compat).
 *   3. Forward qua `aiGatewayService.handleChatCompletion` (auth + rate-limit + quota + log).
 *   4. Convert response ngược lại Anthropic Messages format.
 *
 * Phạm vi hỗ trợ:
 *   - system (string hoặc array of {type:text, text})
 *   - messages: alternating user/assistant, content blocks:
 *       - text
 *       - image (base64 + URL) → OpenAI image_url
 *       - tool_use → OpenAI tool_calls (assistant)
 *       - tool_result → OpenAI tool message
 *   - max_tokens, temperature, top_p, stop_sequences
 *   - stream (SSE Anthropic events)
 *   - tools (input_schema → OpenAI function schema)
 *
 * KHÔNG hỗ trợ (trả error rõ ràng):
 *   - thinking / redacted_thinking blocks (extended thinking)
 *   - citation blocks
 *   - audio / document content blocks (PDF chưa có)
 *
 * Spec tham chiếu:
 *   - Anthropic Messages: https://docs.anthropic.com/en/api/messages
 *   - OpenAI Chat Completions: https://platform.openai.com/docs/api-reference/chat
 */

const ADAPTER_VERSION = '1.0.0'

// === Anthropic Messages types (subset) ===

export type AnthropicTextBlock = { type: 'text'; text: string }
export type AnthropicImageBlock = {
  type: 'image'
  source:
    | { type: 'base64'; media_type: string; data: string }
    | { type: 'url'; url: string }
}
export type AnthropicToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}
export type AnthropicToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  content: string | AnthropicTextBlock[]
  is_error?: boolean
}
export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock

export type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

export type AnthropicMessagesRequest = {
  model: string
  messages: AnthropicMessage[]
  system?: string | AnthropicTextBlock[]
  max_tokens: number
  temperature?: number
  top_p?: number
  stop_sequences?: string[]
  stream?: boolean
  tools?: Array<{
    name: string
    description?: string
    input_schema: Record<string, unknown>
  }>
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string }
  metadata?: { user_id?: string }
}

export type AnthropicUsage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export type AnthropicMessagesResponse = {
  id: string
  type: 'message'
  role: 'assistant'
  content: AnthropicContentBlock[]
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null
  stop_sequence: string | null
  usage: AnthropicUsage
}

// === Errors ===

export class AnthropicAdapterError extends Error {
  readonly status: number
  readonly type: string
  constructor(message: string, type = 'invalid_request_error', status = 400) {
    super(message)
    this.name = 'AnthropicAdapterError'
    this.type = type
    this.status = status
  }
}

// === Request conversion: Anthropic → OpenAI ===

/**
 * Convert Anthropic Messages request → OpenAI Chat Completions request body.
 *
 * Pass-through body fields:
 *   - stream, temperature, top_p, max_tokens → map trực tiếp
 *   - stop_sequences → OpenAI `stop`
 *   - tools → OpenAI `tools` (function format)
 *   - tool_choice → OpenAI `tool_choice`
 */
export function anthropicToOpenAI(req: AnthropicMessagesRequest): ChatCompletionRequest {
  const messages: ChatCompletionRequest['messages'] = []

  // 1. System message(s)
  if (req.system) {
    const systemText = extractSystemText(req.system)
    if (systemText.length > 0) {
      messages.push({ role: 'system', content: systemText })
    }
  }

  // 2. Conversation messages
  for (const msg of req.messages) {
    messages.push(...convertMessage(msg))
  }

  // 3. Tools
  const tools: ChatCompletionRequest['tools'] | undefined = req.tools?.length
    ? req.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }))
    : undefined

  // 4. Tool choice
  let tool_choice: ChatCompletionRequest['tool_choice']
  if (req.tool_choice) {
    if (req.tool_choice.type === 'auto') tool_choice = 'auto'
    else if (req.tool_choice.type === 'any') tool_choice = 'required'
    else if (req.tool_choice.type === 'tool' && req.tool_choice.name) {
      tool_choice = { type: 'function', function: { name: req.tool_choice.name } }
    }
  }

  const out: ChatCompletionRequest = {
    model: req.model,
    messages,
    stream: req.stream ?? false,
    max_tokens: req.max_tokens,
  }
  if (req.temperature !== undefined) out.temperature = req.temperature
  if (req.top_p !== undefined) out.top_p = req.top_p
  if (req.stop_sequences?.length) out.stop = req.stop_sequences
  if (tools) out.tools = tools
  if (tool_choice !== undefined) out.tool_choice = tool_choice

  return out
}

function extractSystemText(system: string | AnthropicTextBlock[]): string {
  if (typeof system === 'string') return system
  return system
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n')
}

function convertMessage(msg: AnthropicMessage): ChatCompletionRequest['messages'] {
  // If content is a simple string → one message.
  if (typeof msg.content === 'string') {
    return [{ role: msg.role, content: msg.content }]
  }

  // Array of content blocks.
  const blocks = msg.content

  if (msg.role === 'user') {
    // Split tool_result blocks out — they become separate "tool" messages.
    const toolResults: Array<{ role: 'tool'; tool_call_id: string; content: string }> = []
    const userBlocks: AnthropicContentBlock[] = []

    for (const block of blocks) {
      if (block.type === 'tool_result') {
        const content =
          typeof block.content === 'string'
            ? block.content
            : block.content
                .filter((b) => b.type === 'text')
                .map((b) => b.text)
                .join('\n')
        toolResults.push({
          role: 'tool',
          tool_call_id: block.tool_use_id,
          content,
        })
      } else {
        userBlocks.push(block)
      }
    }

    const userMsg =
      userBlocks.length > 0
        ? {
            role: 'user' as const,
            content: convertUserContentBlocks(userBlocks),
          }
        : null

    return [...(userMsg ? [userMsg] : []), ...toolResults]
  }

  // assistant: gather text + tool_use.
  if (msg.role === 'assistant') {
    const textParts: string[] = []
    const toolCalls: Array<{
      id: string
      type: 'function'
      function: { name: string; arguments: string }
    }> = []

    for (const block of blocks) {
      if (block.type === 'text') textParts.push(block.text)
      else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input ?? {}),
          },
        })
      }
      // Other block types (thinking, image) — skip with warn
      else {
        logger.warn(
          { blockType: block.type },
          `anthropic-adapter: dropping unsupported assistant block type`
        )
      }
    }

    const assistantMsg: { role: 'assistant'; content: string | null; tool_calls?: typeof toolCalls } = {
      role: 'assistant',
      content: textParts.length > 0 ? textParts.join('\n') : null,
    }
    if (toolCalls.length > 0) assistantMsg.tool_calls = toolCalls

    return [assistantMsg]
  }

  throw new AnthropicAdapterError(`Unsupported message role: ${(msg as { role: string }).role}`)
}

function convertUserContentBlocks(
  blocks: AnthropicContentBlock[]
): string | Array<Record<string, unknown>> {
  // Single text → string.
  if (blocks.length === 1 && blocks[0]?.type === 'text') {
    return blocks[0].text
  }

  // Multi-modal → array of content parts (OpenAI format).
  const parts: Array<Record<string, unknown>> = []
  for (const block of blocks) {
    if (block.type === 'text') {
      parts.push({ type: 'text', text: block.text })
    } else if (block.type === 'image') {
      if (block.source.type === 'base64') {
        parts.push({
          type: 'image_url',
          image_url: {
            url: `data:${block.source.media_type};base64,${block.source.data}`,
          },
        })
      } else {
        parts.push({
          type: 'image_url',
          image_url: { url: block.source.url },
        })
      }
    } else {
      logger.warn(
        { blockType: block.type },
        'anthropic-adapter: dropping unsupported user block type'
      )
    }
  }

  if (parts.length === 0) {
    throw new AnthropicAdapterError('User message has no convertible content blocks')
  }
  return parts
}

// === Response conversion: OpenAI → Anthropic ===

/**
 * Convert OpenAI Chat Completions response → Anthropic Messages response.
 */
export function openAIToAnthropic(
  openaiResp: Record<string, unknown>,
  originalModel: string
): AnthropicMessagesResponse {
  const id = (openaiResp.id as string | undefined) ?? `msg_${randomId()}`
  const choices = (openaiResp.choices as Array<Record<string, unknown>> | undefined) ?? []
  const firstChoice = choices[0] ?? {}
  const finishReason = firstChoice.finish_reason as string | undefined
  const message = firstChoice.message as { content?: unknown; tool_calls?: unknown } | undefined

  const content: AnthropicContentBlock[] = []
  let stopReason: AnthropicMessagesResponse['stop_reason'] = null

  // Text content
  const text = message?.content
  if (typeof text === 'string' && text.length > 0) {
    content.push({ type: 'text', text })
  }

  // Tool calls
  const toolCalls = message?.tool_calls as
    | Array<{
        id: string
        function: { name: string; arguments: string }
      }>
    | undefined

  if (toolCalls && toolCalls.length > 0) {
    for (const tc of toolCalls) {
      let input: unknown = {}
      try {
        input = JSON.parse(tc.function.arguments ?? '{}')
      } catch {
        input = {}
      }
      content.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input,
      })
    }
    stopReason = 'tool_use'
  } else if (finishReason === 'length') {
    stopReason = 'max_tokens'
  } else if (finishReason === 'stop') {
    stopReason = 'end_turn'
  } else if (finishReason === 'content_filter') {
    stopReason = 'end_turn'
  }

  const usage = (openaiResp.usage as Record<string, number> | undefined) ?? {}
  const anthropicUsage: AnthropicUsage = {
    input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? 0,
    output_tokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
  }

  return {
    id,
    type: 'message',
    role: 'assistant',
    content: content.length > 0 ? content : [{ type: 'text', text: '' }],
    model: originalModel,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: anthropicUsage,
  }
}

// === Stream conversion: OpenAI SSE → Anthropic SSE ===

/**
 * Convert OpenAI Chat Completions SSE stream → Anthropic Messages SSE stream.
 *
 * OpenAI chunk format:
 *   data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"text"}}],"usage":null}\n\n
 *
 * Anthropic event sequence:
 *   message_start → content_block_start (if text) → content_block_delta*
 *   → (if tool_use) content_block_start → input_json_delta* → content_block_stop
 *   → message_delta (with stop_reason + usage) → message_stop
 */
export function openAIToAnthropicStream(
  upstream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onUsage?: (usage: AnthropicUsage) => void
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  // Stream state — Anthropic needs an id at message_start.
  const msgId = `msg_${randomId()}`
  let messageStarted = false
  let textBlockOpen = false
  let textBlockIndex = 0
  let toolBlockIndex = -1
  let toolCallsSent = new Set<string>() // track which tool_call_ids we've emitted block_start for

  // Tool call accumulator: id → {name, argsBuffer}
  const toolAcc = new Map<string, { name: string; argsBuffer: string }>()

  let stopReason: AnthropicMessagesResponse['stop_reason'] = null
  let finalUsage: AnthropicUsage | null = null
  let inputTokens = 0
  let outputTokens = 0

  function emit(eventName: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  function openTextBlock(): Uint8Array[] {
    textBlockOpen = true
    return [
      emit('content_block_start', {
        type: 'content_block_start',
        index: textBlockIndex,
        content_block: { type: 'text', text: '' },
      }),
    ]
  }

  function closeTextBlock(): Uint8Array[] {
    textBlockOpen = false
    return [emit('content_block_stop', { type: 'content_block_stop', index: textBlockIndex })]
  }

  function openToolBlock(toolCallId: string, name: string): Uint8Array {
    toolBlockIndex++
    toolCallsSent.add(toolCallId)
    return emit('content_block_start', {
      type: 'content_block_start',
      index: toolBlockIndex,
      content_block: { type: 'tool_use', id: toolCallId, name, input: {} },
    })
  }

  function appendToolInput(toolCallId: string, argsDelta: string): Uint8Array {
    return emit('content_block_delta', {
      type: 'content_block_delta',
      index: toolBlockIndex,
      delta: { type: 'input_json_delta', partial_json: argsDelta },
    })
  }

  function closeToolBlock(): Uint8Array {
    return emit('content_block_stop', { type: 'content_block_stop', index: toolBlockIndex })
  }

  return new ReadableStream<Uint8Array>({
    async start(controller): Promise<void> {
      const reader = upstream.getReader()

      const startMsg = {
        type: 'message_start',
        message: {
          id: msgId,
          type: 'message',
          role: 'assistant',
          content: [],
          model: '',
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      }
      controller.enqueue(emit('message_start', startMsg))

      try {
        while (true) {
          if (signal.aborted) {
            try { await reader.cancel() } catch { /* ignore */ }
            break
          }
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          let boundary = buffer.indexOf('\n\n')
          while (boundary !== -1) {
            const block = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            boundary = buffer.indexOf('\n\n')

            const parsed = parseOpenAISSEBlock(block)
            if (!parsed) continue

            // Usage chunk (final or intermediate)
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens ?? parsed.usage.input_tokens ?? inputTokens
              outputTokens =
                parsed.usage.completion_tokens ?? parsed.usage.output_tokens ?? outputTokens
              finalUsage = { input_tokens: inputTokens, output_tokens: outputTokens }
            }

            // Delta chunk
            if (parsed.delta !== undefined) {
              if (!messageStarted) {
                messageStarted = true
                // First delta triggers ping; nothing else to do here.
              }

              // Text delta
              const text = parsed.delta.content
              if (typeof text === 'string' && text.length > 0) {
                if (!textBlockOpen) {
                  for (const b of openTextBlock()) controller.enqueue(b)
                }
                controller.enqueue(
                  emit('content_block_delta', {
                    type: 'content_block_delta',
                    index: textBlockIndex,
                    delta: { type: 'text_delta', text },
                  })
                )
              }

              // Tool call deltas
              const toolCalls = parsed.delta.tool_calls as
                | Array<{
                    index: number
                    id?: string
                    function?: { name?: string; arguments?: string }
                  }>
                | undefined
              if (toolCalls) {
                for (const tc of toolCalls) {
                  // Close any open text block first
                  if (textBlockOpen) {
                    for (const b of closeTextBlock()) controller.enqueue(b)
                    textBlockIndex++
                  }

                  // Determine stable ID — OpenAI sends id only on first chunk
                  const tcId = tc.id ?? Array.from(toolAcc.keys())[tc.index] ?? `tool_${tc.index}`
                  if (!toolAcc.has(tcId)) {
                    toolAcc.set(tcId, { name: tc.function?.name ?? '', argsBuffer: '' })
                  }
                  const entry = toolAcc.get(tcId)!

                  if (tc.function?.name && !toolCallsSent.has(tcId)) {
                    controller.enqueue(openToolBlock(tcId, entry.name || tc.function.name))
                    if (tc.function.name) entry.name = tc.function.name
                  }
                  if (tc.function?.arguments) {
                    entry.argsBuffer += tc.function.arguments
                    controller.enqueue(appendToolInput(tcId, tc.function.arguments))
                  }
                }
              }
            }

            // Finish reason
            if (parsed.finishReason) {
              if (textBlockOpen) {
                for (const b of closeTextBlock()) controller.enqueue(b)
                textBlockIndex++
              }
              // Close any open tool blocks
              if (toolBlockIndex >= 0) {
                controller.enqueue(closeToolBlock())
                toolBlockIndex = -1
              }
              if (parsed.finishReason === 'length') stopReason = 'max_tokens'
              else if (parsed.finishReason === 'tool_calls') stopReason = 'tool_use'
              else stopReason = 'end_turn'
            }

            // [DONE] sentinel
            if (parsed.done) {
              break
            }
          }
        }
      } catch (err) {
        logger.error(
          { err: (err as Error).message },
          'anthropic-adapter: stream read failed'
        )
      }

      // Finalize: ensure any unclosed blocks are closed.
      if (textBlockOpen) {
        for (const b of closeTextBlock()) controller.enqueue(b)
        textBlockIndex++
      }
      if (toolBlockIndex >= 0) {
        controller.enqueue(closeToolBlock())
        toolBlockIndex = -1
      }

      // Emit message_delta (with usage + stop_reason) + message_stop.
      controller.enqueue(
        emit('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: stopReason, stop_sequence: null },
          usage: finalUsage ?? { input_tokens: 0, output_tokens: 0 },
        })
      )
      controller.enqueue(emit('message_stop', { type: 'message_stop' }))

      if (onUsage && finalUsage) onUsage(finalUsage)

      controller.close()
    },
  })
}

type ParsedOpenAIChunk = {
  delta?: { content?: unknown; tool_calls?: unknown }
  finishReason?: string | null
  usage?: { prompt_tokens?: number; input_tokens?: number; completion_tokens?: number; output_tokens?: number }
  done?: boolean
}

function parseOpenAISSEBlock(block: string): ParsedOpenAIChunk | null {
  // Find the `data: ...` line.
  let payload: string | null = null
  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('data:')) {
      payload = trimmed.slice(5).trim()
      break
    }
  }
  if (payload === null) return null
  if (payload === '[DONE]') return { done: true }
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(payload)
  } catch {
    return null
  }

  const choice = (obj.choices as Array<Record<string, unknown>> | undefined)?.[0]
  const delta = (choice?.delta as { content?: unknown; tool_calls?: unknown } | undefined) ?? undefined
  const finishReason = (choice?.finish_reason as string | null | undefined) ?? undefined
  const usage = (obj.usage as ParsedOpenAIChunk['usage'] | undefined) ?? undefined

  return { delta, finishReason, usage }
}

// === Helpers ===

function randomId(): string {
  // RFC4122-ish. Enough entropy for SSE event ids.
  const a = Math.random().toString(36).slice(2, 10)
  const b = Math.random().toString(36).slice(2, 6)
  return `${a}${b}`
}

// === Error mapping: OpenAI → Anthropic ===

export function openAIErrorToAnthropic(
  status: number,
  openaiError: Record<string, unknown> | string | null
): { type: string; message: string } {
  let type = 'api_error'
  let message = 'Upstream error'

  if (typeof openaiError === 'string') {
    message = openaiError
  } else if (openaiError) {
    const errObj = (openaiError.error as Record<string, unknown> | undefined) ?? openaiError
    const errType = errObj.type as string | undefined
    const errMsg = (errObj.message as string | undefined) ?? (errObj.code as string | undefined)
    if (errMsg) message = errMsg
  }

  // Map by HTTP status first (most reliable signal).
  if (status === 401) {
    type = 'authentication_error'
  } else if (status === 403) {
    type = 'permission_error'
  } else if (status === 404) {
    type = 'not_found_error'
  } else if (status === 429) {
    type = 'rate_limit_error'
  } else if (status >= 400 && status < 500) {
    type = 'invalid_request_error'
  } else {
    type = 'api_error'
  }

  // Refine by body error type if present (e.g. OpenAI returns type=invalid_api_key for 401).
  if (typeof openaiError === 'object' && openaiError) {
    const errObj = (openaiError.error as Record<string, unknown> | undefined) ?? openaiError
    const errType = (errObj.type as string | undefined) ?? ''
    if (errType) {
      if (errType.includes('rate_limit')) type = 'rate_limit_error'
      else if (errType.includes('auth')) type = 'authentication_error'
      else if (errType.includes('permission')) type = 'permission_error'
      else if (errType.includes('not_found')) type = 'not_found_error'
      else if (errType.includes('invalid')) type = 'invalid_request_error'
    }
  }

  return { type, message }
}

export const __adapterVersion = ADAPTER_VERSION
