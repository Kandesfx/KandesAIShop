import { catalogService } from '@/modules/catalog'
import { productQuestionRepository } from './repository'
import type {
  ProductQuestionView,
  CreateQuestionInput,
  AnswerQuestionInput,
  QuestionListFilters,
} from './types'

function toView(question: any): ProductQuestionView {
  return {
    id: question.id,
    productId: question.productId,
    question: question.question,
    answer: question.answer,
    askedBy: {
      id: question.user.id,
      name: question.user.name,
      email: question.user.email || '',
    },
    answeredBy: question.admin
      ? {
          id: question.admin.id,
          name: question.admin.name,
          email: question.admin.email || '',
        }
      : null,
    createdAt: question.createdAt.toISOString(),
    answeredAt: question.answeredAt ? question.answeredAt.toISOString() : null,
    isPublic: question.isPublic,
  }
}

export const productQuestionService = {
  async createQuestion(input: CreateQuestionInput): Promise<ProductQuestionView> {
    // Verify product exists
    const { product } = await catalogService.getProductDetail(input.productSlug)
    if (!product) {
      throw new Error('Product not found')
    }

    const question = await productQuestionRepository.create({
      productId: product.id,
      userId: input.userId,
      question: input.question,
    })

    return toView(question)
  },

  async listQuestions(
    filters: QuestionListFilters
  ): Promise<{ questions: ProductQuestionView[]; total: number }> {
    // Verify product exists
    const { product } = await catalogService.getProductDetail(filters.productSlug)
    if (!product) {
      throw new Error('Product not found')
    }

    const { questions, total } = await productQuestionRepository.listByProduct({
      productId: product.id,
      answered: filters.answered,
      page: filters.page,
      pageSize: filters.pageSize,
    })

    return {
      questions: questions.map(toView),
      total,
    }
  },

  async countByProduct(productId: string): Promise<number> {
    return productQuestionRepository.countByProduct(productId)
  },

  async answerQuestion(input: AnswerQuestionInput): Promise<ProductQuestionView> {
    const question = await productQuestionRepository.answer(
      input.questionId,
      input.answer,
      input.adminId
    )
    return toView(question)
  },

  async toggleVisibility(questionId: string): Promise<void> {
    await productQuestionRepository.toggleVisibility(questionId)
  },

  async deleteQuestion(questionId: string): Promise<void> {
    await productQuestionRepository.delete(questionId)
  },
}
