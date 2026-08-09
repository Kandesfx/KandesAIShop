import { describe, it, expect } from "vitest"

/**
 * Test logic sync countdown qua BroadcastChannel (Phase 9 C6). Component
 * khong dung jsdom/testing-library (theo pattern cua project), nen test tai
 * hien lai dung ham drift-check thuan tu `components/checkout/countdown.tsx`.
 */

const DRIFT_THRESHOLD_MS = 500

/** Tai hien logic quyet dinh co dong bo lai `now` khi nhan duoc message tu tab khac. */
function resolveSyncedNow(
  currentNow: number,
  incomingNow: number,
  currentOrderNumber: string,
  incomingOrderNumber: string,
  currentExpiresAt: string,
  incomingExpiresAt: string
): number {
  if (incomingOrderNumber !== currentOrderNumber || incomingExpiresAt !== currentExpiresAt) {
    return currentNow
  }
  return Math.abs(incomingNow - currentNow) > DRIFT_THRESHOLD_MS ? incomingNow : currentNow
}

describe("Countdown sync — C6 drift check", () => {
  const orderNumber = "KDS-20260809-0001"
  const expiresAt = "2026-08-09T15:00:00.000Z"

  it("dong bo lai now neu lech > 500ms", () => {
    const result = resolveSyncedNow(1_000_000, 1_000_800, orderNumber, orderNumber, expiresAt, expiresAt)
    expect(result).toBe(1_000_800)
  })

  it("giu nguyen now neu lech <= 500ms", () => {
    const result = resolveSyncedNow(1_000_000, 1_000_300, orderNumber, orderNumber, expiresAt, expiresAt)
    expect(result).toBe(1_000_000)
  })

  it("giu nguyen now neu message tu don hang khac (orderNumber khac)", () => {
    const result = resolveSyncedNow(1_000_000, 1_005_000, orderNumber, "KDS-OTHER", expiresAt, expiresAt)
    expect(result).toBe(1_000_000)
  })

  it("giu nguyen now neu message co expiresAt khac (khong cung phien don)", () => {
    const result = resolveSyncedNow(
      1_000_000,
      1_005_000,
      orderNumber,
      orderNumber,
      expiresAt,
      "2026-08-09T16:00:00.000Z"
    )
    expect(result).toBe(1_000_000)
  })

  it("dong bo dung huong ca khi incoming nho hon current (tab khac cham hon)", () => {
    const result = resolveSyncedNow(1_005_000, 1_000_000, orderNumber, orderNumber, expiresAt, expiresAt)
    expect(result).toBe(1_000_000)
  })
})