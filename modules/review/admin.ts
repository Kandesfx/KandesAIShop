import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NotFoundError } from '@/lib/errors'
import { auditService } from '@/modules/audit'
import type { ReviewAdmin } from './types'

/**
 * Admin functions cho review module — P4-04 / P4-03.
 *
 * Các hàm cho admin duyệt reviews.
 */

// Lấy danh sách reviews (filter theo status)
export async function listReviewsForAdmin(
  status: string,
  page: number,
  limit: number
) {
  const skip = (page - 1) * limit

  const where =
    status === 'all'
      ? { deletedAt: null }
      : { status: status as 'pending' | 'approved' | 'rejected', deletedAt: null }

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        product: { select: { id: true, name: true, slug: true } },
        replies: { orderBy: { createdAt: 'asc' }, take: 1 },
      },
    }),
    db.review.count({ where }),
  ])

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.isAnonymous ? 'Ẩn danh' : r.user.name,
      userEmail: r.user.email,
      userAvatarUrl: r.user.avatarUrl,
      productId: r.productId,
      productName: r.product.name,
      productSlug: r.product.slug,
      orderId: r.orderId,
      rating: r.rating,
      title: r.title,
      content: r.content,
      isAnonymous: r.isAnonymous,
      status: r.status,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      deletedAt: r.deletedAt?.toISOString() ?? null,
      reply: r.replies[0] ?? null,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  }
}

// Lấy chi tiết 1 review
export async function getReviewDetail(reviewId: string): Promise<ReviewAdmin> {
  const r = await db.review.findUnique({
    where: { id: reviewId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      product: { select: { id: true, name: true, slug: true } },
      order: { select: { id: true, orderNumber: true, createdAt: true } },
      replies: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!r || r.deletedAt) {
    throw new NotFoundError('Không tìm thấy đánh giá')
  }

  return {
    id: r.id,
    userId: r.userId,
    userName: r.isAnonymous ? 'Ẩn danh' : (r.user.name ?? 'Người dùng'),
    userAvatarUrl: r.user.avatarUrl,
    productId: r.productId,
    productName: r.product.name,
    productSlug: r.product.slug,
    orderId: r.order.id,
    rating: r.rating,
    title: r.title,
    content: r.content,
    isAnonymous: r.isAnonymous,
    helpfulCount: r.helpfulCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: null,
    reply: r.replies[0]
      ? {
          id: r.replies[0].id,
          authorName: r.replies[0].isAdmin ? 'Shop' : (r.user.name ?? 'Người dùng'),
          isAdmin: r.replies[0].isAdmin,
          content: r.replies[0].content,
          createdAt: r.replies[0].createdAt.toISOString(),
        }
      : null,
  }
}

// Duyệt hoặc từ chối review
export async function moderateReview(
  reviewId: string,
  status: 'approved' | 'rejected',
  reply?: string,
  adminId?: string
) {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true, status: true },
  })

  if (!review) {
    throw new NotFoundError('Không tìm thấy đánh giá')
  }

  // Cập nhật review
  const updated = await db.review.update({
    where: { id: reviewId },
    data: { status },
  })

  // Thêm reply nếu có
  if (reply && adminId) {
    await db.reviewReply.create({
      data: {
        reviewId,
        authorId: adminId,
        isAdmin: true,
        content: reply,
      },
    })
  }

  // Cập nhật rating trung bình nếu approved
  if (status === 'approved') {
    const result = await db.review.aggregate({
      where: { productId: review.productId, status: 'approved', deletedAt: null },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await db.product.update({
      where: { id: review.productId },
      data: {
        avgRating: result._avg.rating ?? 0,
        reviewCount: result._count.rating,
      },
    })
  }

  logger.info({ reviewId, status, adminId }, 'Review moderated')
  void auditService
    .record({
      actorId: adminId ?? null,
      actorType: 'admin',
      action: `review.${status}`,
      resourceType: 'review',
      resourceId: reviewId,
      payload: { productId: review.productId, hasReply: !!reply },
    })
    .catch(() => {})
  return updated
}
