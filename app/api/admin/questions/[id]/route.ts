import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { productQuestionService } from '@/modules/product-question'
import { logger } from '@/lib/logger'

interface Context {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const admin = await requireRole('admin')
    const { id } = await context.params
    const body = await req.json()

    if (body.action === 'answer') {
      const { answer } = body
      if (!answer || typeof answer !== 'string') {
        return NextResponse.json({ error: 'answer is required' }, { status: 400 })
      }

      const result = await productQuestionService.answerQuestion({
        questionId: id,
        answer,
        adminId: admin.id,
      })

      return NextResponse.json({ question: result })
    }

    if (body.action === 'toggle-visibility') {
      await productQuestionService.toggleVisibility(id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    logger.error({ err: error }, 'PATCH /api/admin/questions/[id] error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    await requireRole('admin')
    const { id } = await context.params

    await productQuestionService.deleteQuestion(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    logger.error({ err: error }, 'DELETE /api/admin/questions/[id] error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
