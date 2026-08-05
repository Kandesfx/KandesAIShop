import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { logger } from '@/lib/logger'
import { verifyCronAuth, cronCallerLabel } from '@/modules/jobs/auth'
import { runJob, listJobs } from '@/modules/jobs'
import type { JobName } from '@/modules/jobs'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/[name]
 *
 * Generic dispatcher — accepts an existing `JobName` và chạy trong-process.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (constant-time, xem
 * `modules/jobs/auth.ts`).
 *
 * Body: optional JSON `{ "triggeredBy": "string" }`.
 *
 * Response: `{ ok: true, data: { counts: { ... }, durationMs } }`.
 *
 * Names khác (typo, attacker probing) → 404 + log.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    verifyCronAuth(req)
    const { name } = await params

    if (!isKnownJob(name)) {
      logger.warn({ jobName: name }, 'cron: unknown job name (404)')
      return fail({ code: 'NOT_FOUND', message: `Unknown job: ${name}` }, req)
    }

    const startedAt = new Date()
    const triggeredBy = cronCallerLabel(req) ?? (await readTriggeredBy(req)) ?? 'vercel-cron'

    logger.info({ jobName: name, triggeredBy }, 'cron: tick start')

    const counts = await runJob(name as JobName, { startedAt, triggeredBy })
    const durationMs = Date.now() - startedAt.getTime()

    logger.info({ jobName: name, triggeredBy, durationMs, counts }, 'cron: tick done')

    return ok({ counts, durationMs })
  } catch (err) {
    return fail(err, req)
  }
}

/** GET returns the registered job list (admin tool / healthcheck helper). */
export async function GET(req: NextRequest) {
  try {
    verifyCronAuth(req)
    return ok({ jobs: listJobs() })
  } catch (err) {
    return fail(err, req)
  }
}

function isKnownJob(name: string): name is JobName {
  return (listJobs() as string[]).includes(name)
}

async function readTriggeredBy(req: NextRequest): Promise<string | null> {
  try {
    const body = await req.json()
    if (body && typeof body.triggeredBy === 'string' && body.triggeredBy.length <= 64) {
      return body.triggeredBy
    }
  } catch {
    // ignore — không phải mọi caller đều kèm JSON body
  }
  return null
}
