import { z } from 'zod'

/**
 * Zod schemas — Phase 6 P6-04.
 *
 * Validation chỉ ở route boundary (MASTER_SPEC §4.3).
 * Service KHÔNG validate (trust internal calls).
 */

/**
 * Chat completion request — top-level fields only. Inner `messages` content
 * được pass-through verbatim cho upstream.
 */
export const chatCompletionRequestSchema = z.object({
  model: z.string().min(1).max(128),
  messages: z
    .array(
      z.object({
        role: z.string().min(1).max(32),
        content: z.unknown(),
      })
    )
    .min(1)
    .max(256),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().max(1_000_000).optional(),
})

/**
 * OpenAI Responses API request — Phase 7-RB (D56).
 * Codex CLI dùng `input` thay vì `messages`. Pass-through verbatim cho upstream.
 * Inner `input` content KHÔNG validate — KH có thể gửi array, string, hoặc object.
 */
export const responsesRequestSchema = z.object({
  model: z.string().min(1).max(128),
  input: z.unknown(),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().max(1_000_000).optional(),
  instructions: z.string().max(32_000).optional(),
})

export type ResponsesRequestInput = z.infer<typeof responsesRequestSchema>

/** Pagination cho admin NCC key list. */
export const listNccKeysSchema = z.object({
  status: z.enum(['active', 'low_balance', 'exhausted', 'disabled']).optional(),
  provider: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

/** PATCH rotation policy cho 1 AI API key (Phase 7-RB D55). */
export const updateRotationSchema = z.object({
  rotationPolicy: z.enum(['auto', 'pinned']),
  pinnedNccKeyId: z.string().uuid().nullable().optional(),
})

/** Add NCC key (admin) — nhập plaintext, encrypt ở service. */
export const addNccKeySchema = z.object({
  provider: z.enum(['ccpro', 'openai', 'anthropic', 'gemini', 'openrouter', 'deepseek', 'mistral']),
  apiKey: z.string().min(8).max(512),
  totalQuotaUsd: z.number().positive().max(1_000_000),
  nickname: z.string().max(120).optional(),
})

export const updateNccKeySchema = z.object({
  nickname: z.string().max(120).optional(),
  status: z.enum(['active', 'low_balance', 'exhausted', 'disabled']).optional(),
})

/** User tạo API key (P6-08). */
export const createApiKeySchema = z.object({
  planId: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  /** Optional — bind trực tiếp vào 1 NCC key từ pool. */
  nccKeyId: z.string().uuid().optional(),
})

export const deleteApiKeySchema = z.object({
  id: z.string().uuid(),
})

/** Usage analytics — range + groupBy. */
export const usageQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  model: z.string().optional(),
  groupBy: z.enum(['day', 'model', 'provider']).default('day'),
})

export type ChatCompletionRequestInput = z.infer<typeof chatCompletionRequestSchema>
export type ListNccKeysInput = z.infer<typeof listNccKeysSchema>
export type UpdateRotationInput = z.infer<typeof updateRotationSchema>
export type AddNccKeyInput = z.infer<typeof addNccKeySchema>
export type UpdateNccKeyInput = z.infer<typeof updateNccKeySchema>
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
export type UsageQueryInput = z.infer<typeof usageQuerySchema>