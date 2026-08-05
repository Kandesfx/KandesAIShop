import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { parseInput } from '@/lib/http'
import { createTicketSchema } from '@/modules/support/validators'
import { createTicket } from '@/modules/support/service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/support/tickets — create a new support ticket.
 *
 * Auth: user must be logged in.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)
    const input = parseInput(createTicketSchema, await req.json())

    const result = await createTicket(user.id, input)

    return new NextResponse(
      JSON.stringify({ ok: true, data: result }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return fail(err, req)
  }
}