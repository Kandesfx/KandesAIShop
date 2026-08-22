import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ok, fail } from '@/lib/http'
import { uploadToR2, getFileType } from '@/lib/storage-r2'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * POST /api/admin/media/upload — Tải tệp lên Cloudflare R2
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole('staff', 'admin', 'super_admin')

    const formData = await req.formData()
    const folder = (formData.get('folder') as string) || 'uploads'
    
    // Thu thập toàn bộ files từ form data (hỗ trợ cả File lẫn Blob trong Node.js/Next.js)
    const files: Array<{ name: string; size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> }> = []
    
    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'object' && typeof (value as any).arrayBuffer === 'function') {
        const item = value as any
        const name = item.name || (key.includes('.') ? key : 'media-file')
        const size = item.size || 0
        const type = item.type || ''
        files.push({
          name,
          size,
          type,
          arrayBuffer: () => item.arrayBuffer(),
        })
      }
    }

    if (files.length === 0) {
      throw new Error('Không có tệp nào được chọn hoặc định dạng form không hợp lệ')
    }

    const uploadResults = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Tệp "${file.name}" vượt quá dung lượng tối đa cho phép (100MB)`)
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const result = await uploadToR2({
        buffer,
        filename: file.name,
        contentType: file.type || undefined,
        folder,
      })

      uploadResults.push({
        ...result,
        fileType: getFileType(result.filename),
      })
    }

    return ok({
      success: true,
      files: uploadResults,
      count: uploadResults.length,
    }, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
