import type { AiProviderImpl } from './base'
import type { AiProviderName } from '../types'
import { CcProProvider, listModelsFromCcPro } from './ccpro'
import { OpenAiProvider } from './openai'
import { AnthropicProvider } from './anthropic'

/**
 * Provider factory — Phase 6 P6-02.
 *
 * Phase 6 chỉ `ccpro` thật. OpenAI/Anthropic throw nếu cố dùng.
 */

const ccproProvider = new CcProProvider()

const providers: Record<AiProviderName, AiProviderImpl> = {
  ccpro: ccproProvider,
  openai: new OpenAiProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new OpenAiProvider(), // stub — Phase 7+
  openrouter: new OpenAiProvider(), // stub
  deepseek: new OpenAiProvider(), // stub
  mistral: new OpenAiProvider(), // stub
}

export function getProvider(name: AiProviderName): AiProviderImpl {
  const p = providers[name]
  if (!p) throw new Error(`Unknown AI provider: ${name}`)
  return p
}

export type { AiProviderImpl } from './base'
export type { AiProviderName } from '../types'
export { CcProProvider, OpenAiProvider, AnthropicProvider }
export { listModelsFromCcPro }
