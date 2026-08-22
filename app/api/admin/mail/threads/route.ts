import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ok, fail } from '@/lib/http'
import { getMailThreads } from '@/modules/mail/service'
import { EMAIL_ALIASES } from '@/modules/mail/aliases'
import type { ThreadStatus } from '@/modules/mail/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mail/threads — Danh sách Email Threads & Thống kê
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole('staff', 'admin', 'super_admin')

    const url = new URL(req.url)
    const alias = url.searchParams.get('alias') || undefined
    const status = (url.searchParams.get('status') as ThreadStatus | 'all') || undefined
    const search = url.searchParams.get('search') || undefined

    const threads = await getMailThreads({ alias, status, search })

    // Calculate unread counts by alias
    const allThreads = await getMailThreads()
    const stats: Record<string, { total: number; unread: number }> = {
      all: {
        total: allThreads.length,
        unread: allThreads.filter((t) => t.status === 'unread').length,
      },
    }

    for (const a of Object.values(EMAIL_ALIASES)) {
      const aliasThreads = allThreads.filter((t) => t.alias.toLowerCase().includes(a.email.toLowerCase()))
      stats[a.id] = {
        total: aliasThreads.length,
        unread: aliasThreads.filter((t) => t.status === 'unread').length,
      }
    }

    return ok({
      threads,
      stats,
      aliases: Object.values(EMAIL_ALIASES),
    })
  } catch (err) {
    return fail(err, req)
  }
}
