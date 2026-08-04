import type { AiProvider as PrismaAiProvider } from '@prisma/client'
import type { AiProviderImpl } from './base'
import { CcProProvider } from './ccpro'
import { OpenAiProvider } from './openai'
import { AnthropicProvider } from './anthropic'

/**
 * Provider factory — Phase 6 P6-02.
 *
 * Phase 6 chỉ `ccpro` thật. OpenAI/Anthropic throw nếu cố dùng.
 */

const providers: Record<PrismaAiProvider, AiProviderImpl> = {
  ccpro: new CcProProvider(),
  openai: new OpenAiProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new OpenAiProvider(), // stub — Phase 7+
  openrouter: new OpenAiProvider(), // stub
  deepseek: new OpenAiProvider(), // stub
  mistral: new OpenAiProvider(), // stub
}

export function getProvider(name: PrismaAiProvider): AiProviderImpl {
  const p = providers[name]
  if (!p) throw new Error(`Unknown AI provider: ${name}`)
  return p
}

export type { AiProviderImpl } from './base'
export { CcProProvider, OpenAiProvider, AnthropicProvider }