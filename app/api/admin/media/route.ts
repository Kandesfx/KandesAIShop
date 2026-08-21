import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ok, fail } from '@/lib/http'
import { listR2Files, deleteFromR2 } from '@/lib/storage-r2'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/media — Liệt kê file trong Cloudflare R2
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole('staff', 'admin', 'super_admin')
    const url = new URL(req.url)
    const type = url.searchParams.get('type') // 'image' | 'video' | 'document' | 'all'
    const search = url.searchParams.get('search')?.toLowerCase() || ''
    const limit = Number(url.searchParams.get('limit')) || 200

    let files = await listR2Files({ limit })

    if (type && type !== 'all') {
      files = files.filter((f) => f.fileType === type)
    }

    if (search) {
      files = files.filter(
        (f) =>
          f.filename.toLowerCase().includes(search) ||
          f.key.toLowerCase().includes(search)
      )
    }

    return ok({ files, total: files.length })
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * DELETE /api/admin/media — Xóa file khỏi Cloudflare R2
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireRole('staff', 'admin', 'super_admin')
    const body = await req.json()
    const { key } = body

    if (!key || typeof key !== 'string') {
      throw new Error('Key của tệp tin là bắt buộc')
    }

    await deleteFromR2(key)
    return ok({ success: true, message: 'Đã xóa tệp tin thành công' })
  } catch (err) {
    return fail(err, req)
  }
}
