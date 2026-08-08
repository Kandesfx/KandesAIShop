export interface ProductQuestionView {
  id: string
  productId: string
  question: string
  answer: string | null
  askedBy: {
    id: string
    name: string | null
    email: string
  }
  answeredBy: {
    id: string
    name: string | null
    email: string
  } | null
  createdAt: string
  answeredAt: string | null
  isPublic: boolean
}

export interface CreateQuestionInput {
  productSlug: string
  userId: string
  question: string
}

export interface AnswerQuestionInput {
  questionId: string
  answer: string
  adminId: string
}

export interface QuestionListFilters {
  productSlug: string
  answered?: boolean
  page?: number
  pageSize?: number
}
