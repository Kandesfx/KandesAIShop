import { NextRequest, NextResponse } from 'next/server'
import { fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { responsesRequestSchema } from '@/modules/ai-gateway/validators'
import { aiGatewayService } from '@/modules/ai-gateway/service'
import { UnauthorizedError } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/v1/responses
 *
 * OpenAI Responses API endpoint — Phase 7-RB (D56).
 * Codex CLI wire_api='responses' dùng endpoint này.
 *
 * Pass-through body verbatim (Codex CLI gửi raw `input` + model `gpt-5.4`).
 * KHÔNG alias resolution — KH đã gửi raw upstream model name.
 */
export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(`ai:ip:${ip ?? 'unknown'}`, 600, 60_000).catch(() => {})

    const body = responsesRequestSchema.parse(await req.json())
    // Service expects `input` field; Zod đã validate ở trên.
    const response = await aiGatewayService.handleResponses(req, body as never)
    return response
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: err.code, message: err.message } }),
        { status: err.statusCode, headers: { 'Content-Type': 'application/json' } }
      )
    }
    logger.warn({ err: (err as Error).message }, 'responses route error')
    return fail(err, req) as NextResponse
  }
}