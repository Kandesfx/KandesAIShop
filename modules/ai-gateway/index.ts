/**
 * AI Gateway — Phase 6.
 *
 * Reseller model (D46..D52):
 *   - KH mua key trên Kandes → được cấp 1 NCC key từ pool → KH point Claude Code
 *     / Codex / OpenAI client vào `api.kandes.shop/v1` → forward pass-through tới
 *     NCC upstream (`api.ccpro.cn/v1`).
 *   - KHÔNG tính margin theo cost KH giao dịch với NCC.
 *
 * Module map:
 *   - types.ts      — shared types (ForwardRequest, ForwardResponse, AuthContext)
 *   - auth.ts       — Bearer + SHA-256 verify + resolve plan
 *   - quota.ts      — soft cap + rate-limit (D47)
 *   - models.ts     — alias map kandes-* → ccpro/* (D49)
 *   - cost.ts       — pricing table + calc
 *   - failover.ts   — circuit breaker (D50)
 *   - stream.ts     — SSE pass-through (D50, D52)
 *   - service.ts    — orchestrator (forward + log usage)
 *   - ncc-keys.ts   — pool CRUD + pickFromPool + balance sync
 *   - validators.ts — Zod schemas
 *   - delivery.ts   — AI_RESELLER helper
 *   - email.ts      — ai-key-delivered email template
 *   - providers/    — OpenAI-compatible provider impls (ccpro + stubs)
 */

export { aiGatewayService } from './service'
export { authenticateApiKey } from './auth'
export { generateApiToken } from './auth'
export { checkRateLimit, recordQuotaUsage } from './quota'
export { resolveModelAlias } from './models'
export { calculateCost, getPricing } from './cost'
export { getCircuitState, recordSuccess, recordFailure } from './failover'
export { wrapStream, parseStreamUsage } from './stream'
export { addNccKey, listNccKeys, pickFromPool, updateNccKey, disableNccKey } from './ncc-keys'
export { sendApiKeyDeliveredEmail } from './email'
export type {
  AiProviderName,
  ForwardRequest,
  ForwardResponse,
  AuthContext,
  StreamChunkMeta,
  ChatCompletionRequest,
  ModelAliasEntry,
  CircuitState,
  NccKeyView,
  NccKeyCreateInput,
  PricingEntry,
} from './types'