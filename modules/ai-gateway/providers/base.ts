import type { AiProviderName, ForwardRequest, ForwardResponse } from '../types'

/**
 * AiProvider interface — Phase 6 P6-02.
 *
 * Phase 6 chỉ implement `ccpro` (OpenAI-compatible). OpenAI/Anthropic là stubs.
 * Phase 7+ thêm provider thật.
 */
export interface AiProviderImpl {
  readonly name: AiProviderName
  forward(req: ForwardRequest, path?: '/chat/completions' | '/responses'): Promise<ForwardResponse>
  forwardStream(req: ForwardRequest, path?: '/chat/completions' | '/responses'): Promise<ReadableStream<Uint8Array>>
  testConnection(): Promise<{ ok: boolean; latencyMs: number; message?: string }>
}