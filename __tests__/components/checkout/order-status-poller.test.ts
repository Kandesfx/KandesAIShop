import { describe, it, expect } from 'vitest'

/**
 * Test logic của OrderStatusPoller (Phase 9 F3 + C5/F4) — component dùng
 * useEffect/side-effects nên test tái hiện lại đúng các nhánh logic thuần từ
 * `components/checkout/order-status-poller.tsx` (theo pattern star-rating.test.tsx —
 * project không dùng jsdom/@testing-library, chỉ test node environment).
 */

/** Tái hiện điều kiện early-return trong useEffect (F3). */
function shouldSkipPolling(initialStatus: string, initialPaymentStatus: string): boolean {
  if (initialStatus === 'paid' || initialStatus === 'cancelled') return true
  if (
    initialPaymentStatus === 'paid' ||
    initialPaymentStatus === 'refunded' ||
    initialPaymentStatus === 'failed'
  ) {
    return true
  }
  return false
}

/** Tái hiện logic chọn action khi poll trả về status mới. */
function resolvePollAction(
  status: string,
  orderNumber: string,
  onPaidHref?: string
): { action: 'navigate'; href: string } | { action: 'refresh' } | { action: 'continue' } {
  if (status === 'paid') {
    return { action: 'navigate', href: onPaidHref ?? `/order/${orderNumber}/success` }
  }
  if (status === 'cancelled') {
    return { action: 'refresh' }
  }
  return { action: 'continue' }
}

describe('OrderStatusPoller — F3 early-return khi terminal status', () => {
  it('skip polling nếu initialStatus = paid', () => {
    expect(shouldSkipPolling('paid', 'paid')).toBe(true)
  })

  it('skip polling nếu initialStatus = cancelled', () => {
    expect(shouldSkipPolling('cancelled', 'unpaid')).toBe(true)
  })

  it('skip polling nếu initialPaymentStatus = refunded (status khác paid/cancelled)', () => {
    expect(shouldSkipPolling('completed', 'refunded')).toBe(true)
  })

  it('skip polling nếu initialPaymentStatus = failed', () => {
    expect(shouldSkipPolling('processing', 'failed')).toBe(true)
  })

  it('KHÔNG skip khi status=pending + paymentStatus=unpaid', () => {
    expect(shouldSkipPolling('pending', 'unpaid')).toBe(false)
  })

  it('KHÔNG skip khi status=pending + paymentStatus=awaiting', () => {
    expect(shouldSkipPolling('pending', 'awaiting')).toBe(false)
  })
})

describe('OrderStatusPoller — C5+F4 target khi poll trả trạng thái mới', () => {
  it('status=paid → navigate sang /success mặc định (không có onPaidHref)', () => {
    const result = resolvePollAction('paid', 'KDS-20260809-0001')
    expect(result).toEqual({ action: 'navigate', href: '/order/KDS-20260809-0001/success' })
  })

  it('status=paid → navigate sang onPaidHref custom nếu có truyền', () => {
    const result = resolvePollAction('paid', 'KDS-20260809-0001', '/custom/success')
    expect(result).toEqual({ action: 'navigate', href: '/custom/success' })
  })

  it('status=cancelled → refresh tại chỗ, KHÔNG navigate sang success', () => {
    const result = resolvePollAction('cancelled', 'KDS-20260809-0001', '/order/KDS-20260809-0001/success')
    expect(result).toEqual({ action: 'refresh' })
  })

  it('status=pending → continue polling (không action)', () => {
    const result = resolvePollAction('pending', 'KDS-20260809-0001')
    expect(result).toEqual({ action: 'continue' })
  })
})