import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ok, fail } from '@/lib/http'
import { sendMailViaAlias } from '@/modules/mail/service'
import type { SendMailInput } from '@/modules/mail/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/mail/reply — Soạn và gửi thư trả lời khách hàng qua Alias
 */
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole('staff', 'admin', 'super_admin')

    const body = (await req.json()) as SendMailInput

    if (!body.toEmail || !body.toEmail.includes('@')) {
      throw new Error('Địa chỉ email người nhận không hợp lệ')
    }

    if (!body.aliasEmail || !body.aliasEmail.includes('@')) {
      throw new Error('Vui lòng chọn Alias tên miền gửi đi')
    }

    if (!body.subject || body.subject.trim() === '') {
      throw new Error('Tiêu đề thư không được để trống')
    }

    if (!body.bodyHtml || body.bodyHtml.trim() === '') {
      throw new Error('Nội dung thư không được để trống')
    }

    const result = await sendMailViaAlias({
      ...body,
      authorName: adminUser.name || 'Admin Kandes',
    })

    return ok({
      success: true,
      messageId: result.messageId,
      message: result.message,
    }, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
