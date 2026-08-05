/**
 * Review types — P4-04.
 *
 * Định nghĩa data structures cho reviews.
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

/** Review hiển thị cho user (public). */
export interface ReviewPublic {
  id: string
  userId: string
  userName: string
  userAvatarUrl: string | null
  productId: string
  rating: number
  title: string | null
  content: string
  isAnonymous: boolean
  helpfulCount: number
  createdAt: string
  reply?: ReviewReplyPublic | null
}

/** Reply hiển thị cho user. */
export interface ReviewReplyPublic {
  id: string
  authorName: string
  isAdmin: boolean
  content: string
  createdAt: string
}

/** Review đầy đủ cho admin. */
export interface ReviewAdmin extends ReviewPublic {
  orderId: string
  productName: string
  productSlug: string
  updatedAt: string
  deletedAt: string | null
  reply?: ReviewReplyPublic | null
}

/** Input để tạo review. */
export interface CreateReviewInput {
  productId: string
  rating: number
  title?: string
  content: string
  isAnonymous?: boolean
}

/** Input để update review. */
export interface UpdateReviewInput {
  rating?: number
  title?: string | null
  content?: string
  isAnonymous?: boolean
}

/** Kết quả list reviews. */
export interface ListReviewsResult {
  reviews: ReviewPublic[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}
