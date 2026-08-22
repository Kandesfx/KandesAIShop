import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ok, fail } from '@/lib/http'
import { getMailThreadDetails, setThreadStatus } from '@/modules/mail/service'
import type { ThreadStatus } from '@/modules/mail/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mail/threads/[threadId] — Chi tiết một cuộc hội thoại Email
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    await requireRole('staff', 'admin', 'super_admin')

    const details = await getMailThreadDetails(params.threadId)
    if (!details) {
      throw new Error('Không tìm thấy cuộc hội thoại email')
    }

    // Auto mark as read when opened
    if (details.thread.status === 'unread') {
      setThreadStatus(params.threadId, 'read')
      details.thread.status = 'read'
    }

    return ok(details)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * PATCH /api/admin/mail/threads/[threadId] — Cập nhật trạng thái thread
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    await requireRole('staff', 'admin', 'super_admin')

    const body = await req.json()
    const status = body.status as ThreadStatus

    if (!status) {
      throw new Error('Trạng thái status là bắt buộc')
    }

    const success = setThreadStatus(params.threadId, status)
    if (!success) {
      throw new Error('Không tìm thấy thread để cập nhật')
    }

    return ok({ success: true, status })
  } catch (err) {
    return fail(err, req)
  }
}
