import { ok, fail } from '@/lib/http'
import { listAliases } from '@/modules/ai-gateway/models'
import { listModelsFromCcPro } from '@/modules/ai-gateway/providers'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/v1/models
 *
 * OpenAI-compatible models listing.
 * 
 * - Với passthrough key (sk-jy-cc-* hoặc sk-jy-cx-*): fetch models trực tiếp từ NCC Pro
 * - Với Kandes key (ks-*): trả alias `kandes-*` (không lộ upstream)
 */
export async function GET(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
    const token = match?.[1]?.trim()

    // Passthrough NCC key → fetch upstream models
    if (token && /^sk-jy-(cx|cc)-/.test(token)) {
      try {
        const upstreamModels = await listModelsFromCcPro(token)
        return ok({
          object: 'list',
          data: upstreamModels.map((m) => ({
            id: m.id,
            object: 'model',
            owned_by: 'ccpro',
            display_name: m.display_name,
          })),
        })
      } catch (err) {
        logger.warn(
          { err: (err as Error).message },
          'models: failed to fetch upstream, falling back to aliases'
        )
        // Fallback to aliases if upstream fails
      }
    }

    // Default: Kandes aliases
    const aliases = listAliases()
    return ok({
      object: 'list',
      data: aliases.map((a) => ({
        id: a.alias,
        object: 'model',
        owned_by: 'kandes',
      })),
    })
  } catch (err) {
    return fail(err)
  }
}
