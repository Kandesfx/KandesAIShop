import { db } from '@/lib/db'

export const productQuestionRepository = {
  async create(data: { productId: string; userId: string; question: string }) {
    return db.productQuestion.create({
      data: {
        productId: data.productId,
        userId: data.userId,
        question: data.question,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
    })
  },

  async listByProduct(filters: {
    productId: string
    answered?: boolean
    page?: number
    pageSize?: number
  }) {
    const { productId, answered, page = 1, pageSize = 10 } = filters
    const skip = (page - 1) * pageSize

    const where: any = {
      productId,
      isPublic: true,
    }

    if (answered !== undefined) {
      where.answer = answered ? { not: null } : null
    }

    const [questions, total] = await Promise.all([
      db.productQuestion.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.productQuestion.count({ where }),
    ])

    return { questions, total }
  },

  async countByProduct(productId: string) {
    return db.productQuestion.count({
      where: { productId, isPublic: true },
    })
  },

  async answer(questionId: string, answer: string, adminId: string) {
    return db.productQuestion.update({
      where: { id: questionId },
      data: {
        answer,
        answeredBy: adminId,
        answeredAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  },

  async listAllForAdmin(filters: {
    answered?: boolean
    page?: number
    pageSize?: number
  }) {
    const { answered, page = 1, pageSize = 20 } = filters
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (answered !== undefined) {
      where.answer = answered ? { not: null } : null
    }

    const [questions, total] = await Promise.all([
      db.productQuestion.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, slug: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.productQuestion.count({ where }),
    ])

    return { questions, total }
  },

  async toggleVisibility(questionId: string) {
    const question = await db.productQuestion.findUnique({
      where: { id: questionId },
      select: { isPublic: true },
    })

    if (!question) {
      throw new Error('Question not found')
    }

    return db.productQuestion.update({
      where: { id: questionId },
      data: { isPublic: !question.isPublic },
    })
  },

  async delete(questionId: string) {
    return db.productQuestion.delete({
      where: { id: questionId },
    })
  },
}
