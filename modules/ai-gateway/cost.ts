/**
 * Cost calculator — Phase 6 P6-09.
 *
 * Pricing table hard-code (USD per 1K tokens). Phase 7+ có thể move vào DB
 * Setting hoặc NCC balance API nếu admin cần edit runtime.
 *
 * KHÔNG dùng để charge KH — reseller model KH trả NCC trực tiếp (D46).
 * Chỉ dùng cho soft cap pricing + admin cost dashboard.
 */

import type { PricingEntry } from './types'

const PRICING: Record<PricingEntry['family'], PricingEntry> = {
  'gpt-4o': { family: 'gpt-4o', inputPer1k: 0.0025, outputPer1k: 0.01 },
  'claude-sonnet': { family: 'claude-sonnet', inputPer1k: 0.003, outputPer1k: 0.015 },
  'gemini-flash': { family: 'gemini-flash', inputPer1k: 0.000075, outputPer1k: 0.0003 },
  deepseek: { family: 'deepseek', inputPer1k: 0.00027, outputPer1k: 0.0011 },
}

export function getPricing(family: PricingEntry['family']): PricingEntry {
  return PRICING[family]
}

export function getAllPricing(): readonly PricingEntry[] {
  return Object.values(PRICING)
}

/**
 * Compute USD cost for a request.
 * Returns number rounded to 6 decimals (precision matches Decimal(12,6) DB column).
 */
export function calculateCost(
  family: PricingEntry['family'],
  promptTokens: number,
  completionTokens: number
): number {
  const p = PRICING[family]
  const cost =
    (Math.max(0, promptTokens) / 1000) * p.inputPer1k +
    (Math.max(0, completionTokens) / 1000) * p.outputPer1k
  return Math.round(cost * 1_000_000) / 1_000_000
}

/**
 * Check nếu tổng tokens vượt soft cap.
 * Trả true nếu used > cap. Soft cap admin-set, KHÔNG reject — chỉ flag.
 */
export function isOverSoftCap(usedTokens: bigint, softCap: bigint | null): boolean {
  if (softCap == null) return false
  return usedTokens > softCap
}