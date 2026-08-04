import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, parseInput } from '@/lib/http'
import { getClientIp } from '@/lib/http'
import { rateLimitOrThrow } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { chatCompletionRequestSchema } from '@/modules/ai-gateway/validators'
import { aiGatewayService } from '@/modules/ai-gateway/service'
import { UnauthorizedError } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/v1/chat/completions
 *
 * OpenAI-compatible endpoint. KH dùng `Authorization: Bearer ks-xxx`.
 * Phase 6: KHÔNG rate-limit IP — chỉ rate-limit theo apiKey trong auth.ts.
 * Anti-abuse: rate-limit IP cho unauthenticated để chống probe.
 */
export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
    const ip = getClientIp(req)
    // Soft rate-limit IP cho mọi request (probe/abuse protection).
    await rateLimitOrThrow(`ai:ip:${ip ?? 'unknown'}`, 600, 60_000).catch(() => {
      // Best-effort — không block auth.
    })

    const body = parseInput(chatCompletionRequestSchema, await req.json())
    const response = await aiGatewayService.handleChatCompletion(req, body)
    return response
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: err.code, message: err.message } }),
        { status: err.statusCode, headers: { 'Content-Type': 'application/json' } }
      )
    }
    logger.warn({ err: (err as Error).message }, 'chat completions route error')
    return fail(err, req) as NextResponse
  }
}