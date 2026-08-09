import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { productQuestionService } from '@/modules/product-question'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()

    const body = await req.json()
    const { productSlug, question } = body

    if (!productSlug || typeof productSlug !== 'string') {
      return NextResponse.json({ error: 'productSlug is required' }, { status: 400 })
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    const result = await productQuestionService.createQuestion({
      productSlug,
      userId: user.id,
      question: question.trim(),
    })

    return NextResponse.json({ question: result })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error({ err: error }, 'POST /api/me/questions error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
