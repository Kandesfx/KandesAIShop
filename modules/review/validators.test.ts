import { describe, it, expect } from 'vitest'
import {
  createReviewSchema,
  updateReviewSchema,
  listReviewsSchema,
  moderateReviewSchema,
} from './validators'

describe('review validators', () => {
  describe('createReviewSchema', () => {
    it('valid với đầy đủ data', () => {
      const input = {
        rating: 5,
        title: 'Tuyệt vời',
        content: 'Sản phẩm rất tốt, giao hàng nhanh',
        isAnonymous: false,
      }
      expect(createReviewSchema.safeParse(input).success).toBe(true)
    })

    it('valid với content tối thiểu (10 ký tự)', () => {
      const input = {
        rating: 3,
        content: 'San pham tot', // 12 ký tự
      }
      expect(createReviewSchema.safeParse(input).success).toBe(true)
    })

    it('fail khi rating < 1', () => {
      const input = { rating: 0, content: 'Test' }
      expect(createReviewSchema.safeParse(input).success).toBe(false)
    })

    it('fail khi rating > 5', () => {
      const input = { rating: 6, content: 'Test' }
      expect(createReviewSchema.safeParse(input).success).toBe(false)
    })

    it('fail khi content < 10 ký tự', () => {
      const input = { rating: 5, content: 'Ngắn' }
      expect(createReviewSchema.safeParse(input).success).toBe(false)
    })

    it('fail khi title > 200 ký tự', () => {
      const input = { rating: 5, content: 'Content đủ dài để pass', title: 'A'.repeat(201) }
      expect(createReviewSchema.safeParse(input).success).toBe(false)
    })
  })

  describe('updateReviewSchema', () => {
    it('valid với rating update', () => {
      const input = { rating: 4 }
      expect(updateReviewSchema.safeParse(input).success).toBe(true)
    })

    it('valid với partial update', () => {
      const input = { title: 'Tiêu đề mới' }
      expect(updateReviewSchema.safeParse(input).success).toBe(true)
    })

    it('valid khi empty object', () => {
      expect(updateReviewSchema.safeParse({}).success).toBe(true)
    })
  })

  describe('listReviewsSchema', () => {
    it('defaults hợp lệ', () => {
      const result = listReviewsSchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.sort).toBe('newest')
    })

    it('valid sort options', () => {
      expect(listReviewsSchema.safeParse({ sort: 'newest' }).success).toBe(true)
      expect(listReviewsSchema.safeParse({ sort: 'oldest' }).success).toBe(true)
      expect(listReviewsSchema.safeParse({ sort: 'helpful' }).success).toBe(true)
    })

    it('fail với sort không hợp lệ', () => {
      const result = listReviewsSchema.safeParse({ sort: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('limit tối đa 50', () => {
      const result = listReviewsSchema.safeParse({ limit: 100 })
      expect(result.success).toBe(false)
    })
  })

  describe('moderateReviewSchema', () => {
    it('valid approved', () => {
      const input = { status: 'approved' }
      expect(moderateReviewSchema.safeParse(input).success).toBe(true)
    })

    it('valid rejected với reply', () => {
      const input = { status: 'rejected', reply: 'Vi phạm chính sách' }
      expect(moderateReviewSchema.safeParse(input).success).toBe(true)
    })

    it('fail khi status không hợp lệ', () => {
      const input = { status: 'pending' }
      expect(moderateReviewSchema.safeParse(input).success).toBe(false)
    })

    it('fail khi reply > 2000 ký tự', () => {
      const input = { status: 'approved', reply: 'A'.repeat(2001) }
      expect(moderateReviewSchema.safeParse(input).success).toBe(false)
    })
  })
})
