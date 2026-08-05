import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const TWIML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>'

/**
 * /api/voice/respond — Twilio TwiML callback.
 *
 * Step 1 (no `step` or step != 'confirm'): đọc message, gather DTMF.
 *   - GET request từ Twilio TwiML fetch.
 *
 * Step 2 (step=confirm + Digits): nhận 1/2 → log audit, hangup.
 *   - POST request từ Twilio khi user nhập digit.
 *
 * TwiML: <Say voice="vi-VN"> tiếng Việt, <Gather numDigits="1" action="?step=confirm">.
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const msg = searchParams.get('msg') ?? 'Kandes thong bao SLA breach'
  const safeMsg = sanitize(msg).slice(0, 500)

  const twiml = `${TWIML_HEADER}<Response>
  <Gather numDigits="1" action="/api/voice/respond?step=confirm" method="POST">
    <Say voice="vi-VN" language="vi-VN">${escapeXml(safeMsg)}</Say>
    <Say voice="vi-VN" language="vi-VN">Nhấn 1 để xác nhận, 2 để từ chối.</Say>
  </Gather>
  <Say voice="vi-VN" language="vi-VN">Không nhận được phản hồi. Tạm biệt.</Say>
  <Hangup />
</Response>`

  logger.info('twilio voice: twiml step 1 sent')

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  })
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  // Step 2 — Twilio POSTs form with `Digits` field
  const form = await req.formData().catch(() => new FormData())
  const digits = String(form.get('Digits') ?? '')
  const callSid = String(form.get('CallSid') ?? '')
  const from = String(form.get('From') ?? '')

  let decision = 'unknown'
  if (digits === '1') decision = 'confirmed'
  else if (digits === '2') decision = 'rejected'

  logger.info(
    { callSid, from: from ? maskCallerPhone(from) : '', digits, decision },
    'twilio voice: dtmf received'
  )

  // Audit log row (admin actor = "system" — Twilio caller can't authenticate)
  if (digits === '1' || digits === '2') {
    try {
      await db.auditLog.create({
        data: {
          actorType: 'system',
          action: 'twilio.voice.ack',
          resourceType: 'voice_call',
          resourceId: callSid,
          payload: { from: maskCallerPhone(from), digit: digits, decision } as never,
        },
      })
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'voice audit log fail')
    }
  }

  let twiml: string
  if (decision === 'confirmed') {
    twiml = `${TWIML_HEADER}<Response>
  <Say voice="vi-VN" language="vi-VN">Đã xác nhận. Cảm ơn bạn.</Say>
  <Hangup />
</Response>`
  } else if (decision === 'rejected') {
    twiml = `${TWIML_HEADER}<Response>
  <Say voice="vi-VN" language="vi-VN">Đã ghi nhận từ chối. Tạm biệt.</Say>
  <Hangup />
</Response>`
  } else {
    twiml = `${TWIML_HEADER}<Response>
  <Say voice="vi-VN" language="vi-VN">Phím không hợp lệ. Tạm biệt.</Say>
  <Hangup />
</Response>`
  }

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  })
}

function sanitize(s: string): string {
  // Strip XML-unsafe characters early.
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function maskCallerPhone(p: string): string {
  if (p.length <= 4) return '****'
  return `****${p.slice(-4)}`
}
