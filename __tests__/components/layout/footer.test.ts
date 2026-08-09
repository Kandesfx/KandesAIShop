import { describe, it, expect, beforeEach, afterEach } from "vitest"

/**
 * Test logic tinh Build ID cho Footer (Phase 9 D9). Tai hien lai dung logic
 * tu `components/layout/footer.tsx` — khong import truc tiep component vi day
 * la server component (khong co jsdom trong project).
 */
function getBuildId(now: Date): string {
  const override = process.env.NEXT_PUBLIC_BUILD_ID
  if (override && override.trim() !== "") return override.trim()

  const year = now.getFullYear()
  const quarter = Math.ceil((now.getMonth() + 1) / 3)
  return `${year}.Q${quarter}.PHASE-9`
}

describe("Footer getBuildId — D9", () => {
  const originalEnv = process.env.NEXT_PUBLIC_BUILD_ID

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BUILD_ID
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_BUILD_ID
    } else {
      process.env.NEXT_PUBLIC_BUILD_ID = originalEnv
    }
  })

  it("tinh dung quarter cho thang trong Q1 (thang 1-3)", () => {
    expect(getBuildId(new Date("2026-02-15"))).toBe("2026.Q1.PHASE-9")
  })

  it("tinh dung quarter cho thang trong Q3 (thang 7-9)", () => {
    expect(getBuildId(new Date("2026-08-09"))).toBe("2026.Q3.PHASE-9")
  })

  it("tinh dung quarter cho thang trong Q4 (thang 10-12)", () => {
    expect(getBuildId(new Date("2026-12-31"))).toBe("2026.Q4.PHASE-9")
  })

  it("uu tien NEXT_PUBLIC_BUILD_ID neu duoc set (vd: Docker build hash)", () => {
    process.env.NEXT_PUBLIC_BUILD_ID = "abc1234-ci-run-99"
    expect(getBuildId(new Date("2026-08-09"))).toBe("abc1234-ci-run-99")
  })

  it("bo qua NEXT_PUBLIC_BUILD_ID neu la chuoi rong/whitespace", () => {
    process.env.NEXT_PUBLIC_BUILD_ID = "   "
    expect(getBuildId(new Date("2026-08-09"))).toBe("2026.Q3.PHASE-9")
  })
})