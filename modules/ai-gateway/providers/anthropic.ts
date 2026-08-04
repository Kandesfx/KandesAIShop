import type { AiProviderImpl } from './base'
import type { ForwardRequest } from '../types'
import type { AiProvider as PrismaAiProvider } from '@prisma/client'

/**
 * Anthropic provider stub — Phase 6 P6-02.
 * Phase 7+ implement khi user muốn route Anthropic direct (không qua NCC).
 */
export class AnthropicProvider implements AiProviderImpl {
  readonly name: PrismaAiProvider = 'anthropic'

  async forward(_req: ForwardRequest): Promise<never> {
    throw new Error('Anthropic native provider chưa implement Phase 6 — dùng CC Pro')
  }

  async forwardStream(_req: ForwardRequest): Promise<never> {
    throw new Error('Anthropic native provider chưa implement Phase 6 — dùng CC Pro')
  }

  async testConnection(): Promise<never> {
    throw new Error('Anthropic native provider chưa implement Phase 6')
  }
}