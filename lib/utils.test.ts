import { describe, it, expect } from 'vitest'
import { formatVnd, slugify, maskSecret } from '@/lib/utils'

describe('utils', () => {
  it('formatVnd với BigInt (priceCents = VND)', () => {
    // 1 unit = 1 VND (cents đã chuẩn hoá)
    expect(formatVnd(BigInt(19900000))).toMatch(/19\.900\.000/)
    expect(formatVnd(BigInt(240000))).toMatch(/240\.000/)
    expect(formatVnd(null)).toBe('—')
    expect(formatVnd(undefined)).toBe('—')
  })

  it('slugify chuẩn hoá tiếng Việt có dấu', () => {
    expect(slugify('Cursor Pro 1 Tháng')).toBe('cursor-pro-1-thang')
    expect(slugify('Đặc biệt')).toBe('dac-biet')
    expect(slugify('  Nhiều   khoảng   trắng  ')).toBe('nhieu-khoang-trang')
  })

  it('maskSecret che value', () => {
    expect(maskSecret('sk-abc-very-long-secret-token')).toBe('sk-a***')
    expect(maskSecret('')).toBe('')
    expect(maskSecret('abc')).toBe('***')
  })
})
