import { NextRequest, NextResponse } from 'next/server'
import { productQuestionService } from '@/modules/product-question'

interface Context {
  params: Promise<{ slug: string }>
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params
    const { searchParams } = new URL(req.url)
    
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const answeredParam = searchParams.get('answered')
    
    let answered: boolean | undefined = undefined
    if (answeredParam === 'true') answered = true
    if (answeredParam === 'false') answered = false

    const result = await productQuestionService.listQuestions({
      productSlug: slug,
      answered,
      page,
      pageSize,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/products/[slug]/questions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
