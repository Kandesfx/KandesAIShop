import type { AiProviderImpl } from './base'
import type { ForwardRequest } from '../types'
import type { AiProvider as PrismaAiProvider } from '@prisma/client'

/**
 * OpenAI provider stub — Phase 6 P6-02.
 *
 * Phase 6 KHÔNG dùng. Stub để Phase 7+ implement chính thức khi user muốn
 * point trực tiếp vào OpenAI (không qua NCC pool).
 *
 * Phase 6 deviation D46..D52 — chỉ ccpro thật, các provider khác throw.
 */
export class OpenAiProvider implements AiProviderImpl {
  readonly name: PrismaAiProvider = 'openai'

  async forward(_req: ForwardRequest, _path?: '/chat/completions' | '/responses'): Promise<never> {
    throw new Error('OpenAI native provider chưa implement Phase 6 — dùng CC Pro')
  }

  async forwardStream(_req: ForwardRequest, _path?: '/chat/completions' | '/responses'): Promise<never> {
    throw new Error('OpenAI native provider chưa implement Phase 6 — dùng CC Pro')
  }

  async testConnection(): Promise<never> {
    throw new Error('OpenAI native provider chưa implement Phase 6')
  }
}