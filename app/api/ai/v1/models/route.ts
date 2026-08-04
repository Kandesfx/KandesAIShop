import { ok, fail } from '@/lib/http'
import { listAliases } from '@/modules/ai-gateway/models'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/v1/models
 *
 * OpenAI-compatible models listing. KHÔNG lộ upstream (D49) — chỉ alias
 * `kandes-*`.
 */
export async function GET(req: Request): Promise<Response> {
  try {
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