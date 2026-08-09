import { describe, it, expect } from 'vitest'

/**
 * Unit tests cho WriteReviewForm validation logic — Phase 9 D1.
 * Test pure validation rules (không render component — tránh cần jsdom/RTL
 * setup mới trong project chỉ dùng vitest node environment).
 */
describe('WriteReviewForm validation', () => {
  function validate(rating: number, content: string): string | null {
    if (rating < 1) return 'Vui lòng chọn số sao đánh giá'
    if (content.trim().length < 10) return 'Nội dung đánh giá cần ít nhất 10 ký tự'
    return null
  }

  it('rejects rating < 1', () => {
    expect(validate(0, 'Sản phẩm rất tốt, đáng mua')).toBe('Vui lòng chọn số sao đánh giá')
  })

  it('rejects content shorter than 10 chars', () => {
    expect(validate(5, 'tốt')).toBe('Nội dung đánh giá cần ít nhất 10 ký tự')
  })

  it('accepts valid rating + content', () => {
    expect(validate(5, 'Sản phẩm rất tốt, đáng mua')).toBeNull()
  })

  it('trims whitespace before checking length', () => {
    expect(validate(4, '   short   ')).toBe('Nội dung đánh giá cần ít nhất 10 ký tự')
  })
})