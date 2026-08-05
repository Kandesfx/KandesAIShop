import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '@/lib/errors'
import type {
  CreateReviewInput,
  UpdateReviewInput,
  ListReviewsResult,
  ReviewPublic,
} from './types'

/**
 * Review service — P4-04.
 *
 * Nghiệp vụ reviews:
 * - User đã mua sản phẩm (order DELIVERED/COMPLETED) mới được review.
 * - Mỗi user chỉ review 1 lần cho 1 sản phẩm.
 * - Sửa review trong 7 ngày.
 * - Xoá review (soft delete).
 * - Helpful count.
 */

// Kiểm tra user đã mua sản phẩm chưa
async function hasPurchased(userId: string, productId: string): Promise<boolean> {
  const order = await db.order.findFirst({
    where: {
      userId,
      items: { some: { productId } },
      status: { in: ['delivered', 'completed'] },
    },
    select: { id: true },
  })
  return !!order
}

// Lấy thông tin user để hiển thị (ẩn nếu anonymous)
async function getUserDisplay(userId: string, isAnonymous: boolean) {
  if (isAnonymous) {
    return { name: 'Khách hàng', avatarUrl: null }
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, avatarUrl: true },
  })
  return {
    name: user?.name ?? 'Người dùng',
    avatarUrl: user?.avatarUrl ?? null,
  }
}

// Tạo review mới
export async function createReview(
  userId: string,
  input: CreateReviewInput
): Promise<ReviewPublic> {
  // Kiểm tra đã mua chưa
  const purchased = await hasPurchased(userId, input.productId)
  if (!purchased) {
    throw new ForbiddenError('Bạn cần mua sản phẩm trước khi đánh giá')
  }

  // Kiểm tra đã review chưa
  const existing = await db.review.findUnique({
    where: { userId_productId: { userId, productId: input.productId } },
    select: { id: true },
  })
  if (existing) {
    throw new ConflictError('Bạn đã đánh giá sản phẩm này rồi')
  }

  // Lấy order để link
  const order = await db.order.findFirst({
    where: {
      userId,
      items: { some: { productId: input.productId } },
      status: { in: ['delivered', 'completed'] },
    },
    select: { id: true },
  })

  // Tạo review
  const review = await db.review.create({
    data: {
      userId,
      productId: input.productId,
      orderId: order!.id,
      rating: input.rating,
      title: input.title ?? null,
      content: input.content,
      isAnonymous: input.isAnonymous ?? false,
      status: 'pending', // Chờ duyệt
    },
  })

  // Cập nhật rating trung bình của sản phẩm
  await updateProductRating(input.productId)

  const userDisplay = await getUserDisplay(userId, review.isAnonymous)

  logger.info({ reviewId: review.id, userId, productId: input.productId }, 'Review created')

  return {
    id: review.id,
    userId: review.userId,
    userName: userDisplay.name,
    userAvatarUrl: userDisplay.avatarUrl,
    productId: review.productId,
    rating: review.rating,
    title: review.title,
    content: review.content,
    isAnonymous: review.isAnonymous,
    helpfulCount: review.helpfulCount,
    createdAt: review.createdAt.toISOString(),
    reply: null,
  }
}

// Cập nhật review (trong 7 ngày)
export async function updateReview(
  reviewId: string,
  userId: string,
  input: UpdateReviewInput
): Promise<ReviewPublic> {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { userId: true, productId: true, createdAt: true },
  })

  if (!review) {
    throw new NotFoundError('Không tìm thấy đánh giá')
  }

  if (review.userId !== userId) {
    throw new ForbiddenError('Bạn không có quyền sửa đánh giá này')
  }

  // Kiểm tra 7 ngày
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  const createdTime = review.createdAt.getTime()
  const now = Date.now()
  if (now - createdTime > sevenDays) {
    throw new ValidationError('Chỉ có thể sửa đánh giá trong 7 ngày')
  }

  const updated = await db.review.update({
    where: { id: reviewId },
    data: {
      rating: input.rating ?? undefined,
      title: input.title ?? undefined,
      content: input.content ?? undefined,
      isAnonymous: input.isAnonymous ?? undefined,
      status: 'pending', // Re-pending sau khi sửa
    },
  })

  await updateProductRating(review.productId)

  const userDisplay = await getUserDisplay(userId, updated.isAnonymous)

  return {
    id: updated.id,
    userId: updated.userId,
    userName: userDisplay.name,
    userAvatarUrl: userDisplay.avatarUrl,
    productId: updated.productId,
    rating: updated.rating,
    title: updated.title,
    content: updated.content,
    isAnonymous: updated.isAnonymous,
    helpfulCount: updated.helpfulCount,
    createdAt: updated.createdAt.toISOString(),
    reply: null,
  }
}

// Xoá review (soft delete)
export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { userId: true, productId: true },
  })

  if (!review) {
    throw new NotFoundError('Không tìm thấy đánh giá')
  }

  if (review.userId !== userId) {
    throw new ForbiddenError('Bạn không có quyền xoá đánh giá này')
  }

  await db.review.update({
    where: { id: reviewId },
    data: { deletedAt: new Date() },
  })

  await updateProductRating(review.productId)

  logger.info({ reviewId, userId }, 'Review deleted')
}

// Lấy reviews của 1 sản phẩm (chỉ approved)
export async function listProductReviews(
  productId: string,
  page: number,
  limit: number,
  sort: 'newest' | 'oldest' | 'helpful'
): Promise<ListReviewsResult> {
  const skip = (page - 1) * limit

  const orderBy =
    sort === 'helpful'
      ? { helpfulCount: 'desc' as const }
      : sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : { createdAt: 'desc' as const }

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where: { productId, status: 'approved', deletedAt: null },
      orderBy,
      skip,
      take: limit,
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Chỉ lấy reply mới nhất
        },
      },
    }),
    db.review.count({
      where: { productId, status: 'approved', deletedAt: null },
    }),
  ])

  const reviewPublics: ReviewPublic[] = await Promise.all(
    reviews.map(async (r) => {
      const userDisplay = await getUserDisplay(r.userId, r.isAnonymous)
      const firstReply = r.replies[0]
      const reply = firstReply
        ? {
            id: firstReply.id,
            authorName: firstReply.isAdmin ? 'Shop' : 'Người dùng',
            isAdmin: firstReply.isAdmin,
            content: firstReply.content,
            createdAt: firstReply.createdAt.toISOString(),
          }
        : null

      return {
        id: r.id,
        userId: r.userId,
        userName: userDisplay.name,
        userAvatarUrl: userDisplay.avatarUrl,
        productId: r.productId,
        rating: r.rating,
        title: r.title,
        content: r.content,
        isAnonymous: r.isAnonymous,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt.toISOString(),
        reply,
      }
    })
  )

  return {
    reviews: reviewPublics,
    page,
    limit,
    total,
    hasMore: page * limit < total,
  }
}

// Lấy reviews của user (account page)
export async function listUserReviews(
  userId: string,
  page: number,
  limit: number
): Promise<ListReviewsResult> {
  const skip = (page - 1) * limit

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        product: { select: { id: true, name: true, slug: true, media: { take: 1, select: { url: true } } } },
      },
    }),
    db.review.count({ where: { userId, deletedAt: null } }),
  ])

  const reviewPublics: ReviewPublic[] = reviews.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.isAnonymous ? 'Khách hàng' : 'Tôi',
    userAvatarUrl: null,
    productId: r.productId,
    rating: r.rating,
    title: r.title,
    content: r.content,
    isAnonymous: r.isAnonymous,
    helpfulCount: r.helpfulCount,
    createdAt: r.createdAt.toISOString(),
    reply: null,
  }))

  return {
    reviews: reviewPublics,
    page,
    limit,
    total,
    hasMore: page * limit < total,
  }
}

// Tăng helpful count
export async function markHelpful(reviewId: string, oderId: string): Promise<void> {
  await db.review.update({
    where: { id: reviewId },
    data: { helpfulCount: { increment: 1 } },
  })
  logger.info({ reviewId, oderId }, 'Review marked helpful')
}

// Cập nhật rating trung bình của sản phẩm
async function updateProductRating(productId: string): Promise<void> {
  const result = await db.review.aggregate({
    where: { productId, status: 'approved', deletedAt: null },
    _avg: { rating: true },
    _count: { rating: true },
  })

  await db.product.update({
    where: { id: productId },
    data: {
      avgRating: result._avg.rating ?? 0,
      reviewCount: result._count.rating,
    },
  })
}

export const reviewService = {
  createReview,
  updateReview,
  deleteReview,
  listProductReviews,
  listUserReviews,
  markHelpful,
}
