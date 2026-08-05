export type FaqCategory = 'general' | 'payment' | 'delivery' | 'account' | 'refund' | 'technical'
export type FaqStatus = 'draft' | 'published' | 'archived'

export interface FaqView {
  id: string
  category: FaqCategory
  question: string
  answer: string
  position: number
  status: FaqStatus
  viewCount: number
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface CreateFaqInput {
  category: FaqCategory
  question: string
  answer: string
  position?: number
  status?: FaqStatus
}

export interface UpdateFaqInput {
  category?: FaqCategory
  question?: string
  answer?: string
  position?: number
  status?: FaqStatus
}
