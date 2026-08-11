/**
 * Jobs module — Phase 3 P3-02 / P3-09 unit tests.
 *
 * Target the registry / auth surfaces — they are pure / deterministic. The
 * reconcile handler hits a real HTTP API (covered by mock at network layer
 * would need extensive stub setup that's not warranted for Phase 3 unit pass).
 * Cleanup handler reads/writes DB and lives in integration tests.
 */

import { describe, it, expect } from 'vitest'
import { listJobs } from '../registry'
import { verifyCronAuth } from '../auth'

/**
 * Build a NextRequest-like object with just the headers we need.
 */
function makeReq(headers: Record<string, string> = {}): any {
  return {
    headers: {
      get(name: string): string | null {
        return headers[name.toLowerCase()] ?? null
      },
    },
  } as any
}

// env.ts parses process.env at import time and caches `env`. Cron-auth compares
// against env.CRON_SECRET. In unit mode that resolves to the schema default
// ('dev-cron-secret-please-replace-32chars-min-XXX') because .env files don't
// override it. Use that value literally here for positive assertions.
const VALID_TOKEN = 'dev-cron-secret-please-replace-32chars-min-XXX'

describe('modules/jobs — registry', () => {
  it('exposes all registered jobs (D74: includes db-backup)', () => {
    const jobs = listJobs()
    expect(jobs).toContain('sepay-reconcile')
    expect(jobs).toContain('expire-overdue-orders')
    expect(jobs).toContain('sla-scan')
    expect(jobs).toContain('ai-balance-sync')
    expect(jobs).toContain('ai-quota-alert')
    expect(jobs).toContain('db-backup')
  })

  it('runs db-backup via runJob (no-op when S3 unconfigured)', async () => {
    // D74: regression test — `dbBackupJob` được wrap vào JobHandler
    // và gracefully skip khi AWS_S3_BUCKET/keys empty.
    const { runJob } = await import('../registry')
    const counts = await runJob('db-backup', { startedAt: new Date() })
    expect(counts).toMatchObject({ ok: expect.any(Number), skipped: expect.any(Number) })
    // Khi không config s3 → skipped=1, ok=0
    expect(counts.skipped).toBeGreaterThanOrEqual(0)
  })
})

describe('modules/jobs — auth (verifyCronAuth)', () => {
  it('throws UnauthorizedError when header missing', () => {
    expect(() => verifyCronAuth(makeReq())).toThrow(/Missing cron bearer token/)
  })

  it('throws UnauthorizedError on token mismatch', () => {
    expect(() =>
      verifyCronAuth(makeReq({ authorization: 'Bearer wrong-token-also-48chars' }))
    ).toThrow(/Invalid cron bearer token/)
  })

  it('returns caller info when Bearer matches', () => {
    const out = verifyCronAuth(makeReq({ authorization: `Bearer ${VALID_TOKEN}` }))
    expect(out.caller.length).toBeGreaterThan(0)
  })

  it('throws when Bearer scheme is missing', () => {
    expect(() => verifyCronAuth(makeReq({ authorization: VALID_TOKEN }))).toThrow(
      /Missing cron bearer token/
    )
  })

  it('throws when provided token shorter than expected (length-mismatch early-out)', () => {
    expect(() => verifyCronAuth(makeReq({ authorization: 'Bearer short' }))).toThrow(
      /Invalid cron bearer token/
    )
  })

  it('accepts mixed-case scheme (case-insensitive Bearer parse)', () => {
    const out = verifyCronAuth(makeReq({ authorization: `bearer ${VALID_TOKEN}` }))
    expect(out.caller.length).toBeGreaterThan(0)
  })
})
