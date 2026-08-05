import { describe, it, expect } from 'vitest'
import { GUEST_CART_COOKIE, GUEST_CART_TTL_SEC, generateGuestToken } from '@/modules/cart/guest'

describe('cart/guest', () => {
  it('GUEST_CART_COOKIE constant đúng tên', () => {
    expect(GUEST_CART_COOKIE).toBe('kds_cart')
  })

  it('GUEST_CART_TTL_SEC = 30 ngày', () => {
    expect(GUEST_CART_TTL_SEC).toBe(30 * 24 * 60 * 60)
  })

  it('generateGuestToken — hex 64 ký tự', () => {
    const token = generateGuestToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })

  it('generateGuestToken — mỗi lần unique', () => {
    const a = generateGuestToken()
    const b = generateGuestToken()
    expect(a).not.toBe(b)
  })
})
