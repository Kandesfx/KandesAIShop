import { describe, it, expect } from 'vitest'
import {
  calculateCost,
  getPricing,
  getAllPricing,
  isOverSoftCap,
} from './cost'

describe('cost calculator', () => {
  it('getPricing returns pricing cho known family', () => {
    const p = getPricing('gpt-4o')
    expect(p.inputPer1k).toBeGreaterThan(0)
    expect(p.outputPer1k).toBeGreaterThan(0)
  })

  it('getAllPricing returns 4 families', () => {
    expect(getAllPricing()).toHaveLength(4)
  })

  it('calculateCost — gpt-4o 1K in + 1K out', () => {
    const cost = calculateCost('gpt-4o', 1000, 1000)
    expect(cost).toBeCloseTo(0.0025 + 0.01, 6)
  })

  it('calculateCost — 0 tokens → 0', () => {
    expect(calculateCost('gpt-4o', 0, 0)).toBe(0)
  })

  it('calculateCost — negative input clamped to 0', () => {
    expect(calculateCost('gpt-4o', -100, 1000)).toBeCloseTo(0.01, 6)
  })

  it('isOverSoftCap — null cap → false', () => {
    expect(isOverSoftCap(1000n, null)).toBe(false)
  })

  it('isOverSoftCap — used > cap → true', () => {
    expect(isOverSoftCap(101n, 100n)).toBe(true)
  })

  it('isOverSoftCap — used == cap → false', () => {
    expect(isOverSoftCap(100n, 100n)).toBe(false)
  })

  it('isOverSoftCap — used < cap → false', () => {
    expect(isOverSoftCap(99n, 100n)).toBe(false)
  })
})