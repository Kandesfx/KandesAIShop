import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ok, fail } from '@/lib/http'
import { createPresignedUploadUrl } from '@/lib/storage-r2'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/media/presign — Tạo URL Presigned để tải trực tiếp lên Cloudflare R2
 * Trình duyệt đẩy thẳng file lên Cloudflare R2 Edge trong tích tắc, giữ nguyên 100% dung lượng & chất lượng gốc.
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole('staff', 'admin', 'super_admin')

    const body = await req.json()
    const { filename, contentType, folder } = body

    if (!filename || typeof filename !== 'string') {
      throw new Error('Tên tệp filename là bắt buộc')
    }

    const presigned = await createPresignedUploadUrl({
      filename,
      contentType,
      folder: folder || 'uploads',
    })

    return ok(presigned)
  } catch (err) {
    return fail(err, req)
  }
}
