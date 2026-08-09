import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reviewService } from './service'

/**
 * Unit tests cho review service — P4-04.
 */

// Mock modules
vi.mock('@/lib/db', () => ({
  db: {
    order: {
      findFirst: vi.fn(),
    },
    review: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    product: {
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('review service — validation', () => {
  it('should export service functions', () => {
    expect(reviewService.createReview).toBeDefined()
    expect(reviewService.updateReview).toBeDefined()
    expect(reviewService.deleteReview).toBeDefined()
    expect(reviewService.listProductReviews).toBeDefined()
    expect(reviewService.listUserReviews).toBeDefined()
    expect(reviewService.markHelpful).toBeDefined()
  })
})

/**
 * Integration-style test (mocked DB) — Phase 9 D1.
 * Verify submit review → updateProductRating() được gọi để cập nhật
 * Product.avgRating + reviewCount dựa trên aggregate của reviews đã approved.
 */
describe('review service — createReview updates Product.avgRating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gọi product.update với avgRating + reviewCount từ aggregate sau khi tạo review', async () => {
    const { db } = await import('@/lib/db')

    vi.mocked(db.order.findFirst).mockResolvedValue({ id: 'order-1' } as never)
    vi.mocked(db.review.findUnique).mockResolvedValue(null)
    vi.mocked(db.review.create).mockResolvedValue({
      id: 'review-1',
      userId: 'user-1',
      productId: 'product-1',
      orderId: 'order-1',
      rating: 5,
      title: null,
      content: 'Sản phẩm rất tốt, đáng mua',
      isAnonymous: false,
      helpfulCount: 0,
      status: 'pending',
      createdAt: new Date('2026-08-09T00:00:00Z'),
      updatedAt: new Date('2026-08-09T00:00:00Z'),
      deletedAt: null,
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      name: 'Test User',
      avatarUrl: null,
    } as never)
    vi.mocked(db.review.aggregate).mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    } as never)
    vi.mocked(db.product.update).mockResolvedValue({} as never)

    await reviewService.createReview('user-1', {
      productId: 'product-1',
      rating: 5,
      content: 'Sản phẩm rất tốt, đáng mua',
    })

    expect(db.review.aggregate).toHaveBeenCalledWith({
      where: { productId: 'product-1', status: 'approved', deletedAt: null },
      _avg: { rating: true },
      _count: { rating: true },
    })
    expect(db.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { avgRating: 4.5, reviewCount: 2 },
    })
  })
})
