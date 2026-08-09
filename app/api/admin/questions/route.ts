import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { productQuestionRepository } from '@/modules/product-question'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireRole('admin')

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const answeredParam = searchParams.get('answered')

    let answered: boolean | undefined = undefined
    if (answeredParam === 'true') answered = true
    if (answeredParam === 'false') answered = false

    const result = await productQuestionRepository.listAllForAdmin({
      answered,
      page,
      pageSize,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    logger.error({ err: error }, 'GET /api/admin/questions error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
