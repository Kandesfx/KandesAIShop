import { describe, it, expect } from 'vitest'

/**
 * Test logic tính step index cho CheckoutTimeline (component chỉ render JSX
 * từ index, không có logic phức tạp — test phần tính toán isDone/isCurrent).
 */

const STEPS = ['cart', 'payment', 'done'] as const
type Step = (typeof STEPS)[number]

function computeStepStates(current: Step) {
  const currentIndex = STEPS.indexOf(current)
  return STEPS.map((step, i) => ({
    step,
    isDone: i < currentIndex,
    isCurrent: i === currentIndex,
  }))
}

describe('CheckoutTimeline step logic', () => {
  it('current="cart" → chỉ cart là current, không có done', () => {
    const states = computeStepStates('cart')
    expect(states[0]).toEqual({ step: 'cart', isDone: false, isCurrent: true })
    expect(states[1]).toEqual({ step: 'payment', isDone: false, isCurrent: false })
    expect(states[2]).toEqual({ step: 'done', isDone: false, isCurrent: false })
  })

  it('current="payment" → cart done, payment current', () => {
    const states = computeStepStates('payment')
    expect(states[0]).toEqual({ step: 'cart', isDone: true, isCurrent: false })
    expect(states[1]).toEqual({ step: 'payment', isDone: false, isCurrent: true })
    expect(states[2]).toEqual({ step: 'done', isDone: false, isCurrent: false })
  })

  it('current="done" → cart + payment done, done current', () => {
    const states = computeStepStates('done')
    expect(states[0]).toEqual({ step: 'cart', isDone: true, isCurrent: false })
    expect(states[1]).toEqual({ step: 'payment', isDone: true, isCurrent: false })
    expect(states[2]).toEqual({ step: 'done', isDone: false, isCurrent: true })
  })
})
