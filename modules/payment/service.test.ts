import { describe, it, expect } from 'vitest'
import { extractPaymentReference } from '@/modules/payment/service'

/**
 * Unit test cho pure function `extractPaymentReference`.
 * Phần DB-bound `recordPayment` đã được cover bởi integration test.
 */

describe('payment service — extractPaymentReference', () => {
  it('trích xuất short ref "KDSxxxxx" (6-8 alphanumeric)', () => {
    expect(extractPaymentReference('KDS3XW0UOKZ thanh toan')).toBe('KDS3XW0UOKZ')
  })

  it('trích xuất full ref "KDS-YYYYMMDD-NNNN"', () => {
    expect(extractPaymentReference('KH mua hang KDS-20260804-0042')).toBe(
      'KDS-20260804-0042'
    )
  })

  it('không match khi thiếu "KDS"', () => {
    expect(extractPaymentReference('random text')).toBeNull()
  })

  it('không match khi chỉ có 1-3 digits', () => {
    expect(extractPaymentReference('KDS 1')).toBeNull()
    expect(extractPaymentReference('KDS 42')).toBeNull()
    expect(extractPaymentReference('KDS 999')).toBeNull()
  })

  it('match short ref với optional space', () => {
    expect(extractPaymentReference('KDS 0001')).toBe('KDS 0001')
  })
})