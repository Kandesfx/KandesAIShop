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
