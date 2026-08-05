import { describe, it, expect, beforeEach, vi } from 'vitest'

const queryRawMock = vi.fn()
const groupByMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    notification: {
      groupBy: (...args: unknown[]) => groupByMock(...args),
    },
  },
}))

const envMock = vi.hoisted(() => ({
  UPSTASH_REDIS_REST_URL: undefined as string | undefined,
  UPSTASH_REDIS_REST_TOKEN: undefined as string | undefined,
  SEPAY_API_TOKEN: undefined as string | undefined,
  SEPAY_ACCOUNT_NUMBER: undefined as string | undefined,
  EMAIL_PROVIDER: 'console' as string,
  RESEND_API_KEY: undefined as string | undefined,
}))
vi.mock('@/lib/env', () => ({
  env: envMock,
}))

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/modules/jobs', () => ({
  listJobs: () => ['sepay-reconcile', 'expire-overdue-orders', 'sla-scan'],
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { healthService } from './service'

beforeEach(() => {
  queryRawMock.mockReset()
  groupByMock.mockReset()
  fetchMock.mockReset()
  envMock.UPSTASH_REDIS_REST_URL = undefined
  envMock.UPSTASH_REDIS_REST_TOKEN = undefined
  envMock.SEPAY_API_TOKEN = undefined
  envMock.SEPAY_ACCOUNT_NUMBER = undefined
  envMock.EMAIL_PROVIDER = 'console'
  envMock.RESEND_API_KEY = undefined
})

describe('health service — P4-10', () => {
  describe('checkDatabase', () => {
    it('ok khi queryRaw thành công', async () => {
      queryRawMock.mockResolvedValueOnce([{ '?column?': 1 }])
      const r = await healthService.checkDatabase()
      expect(r.status).toBe('ok')
      expect(r.name).toBe('database')
    })

    it('fail khi queryRaw throw', async () => {
      queryRawMock.mockRejectedValueOnce(new Error('connection timeout'))
      const r = await healthService.checkDatabase()
      expect(r.status).toBe('fail')
      expect(r.message).toContain('connection timeout')
    })

    it('warn khi latency > 1000ms', async () => {
      queryRawMock.mockImplementationOnce(
        () => new Promise((res) => setTimeout(() => res([{ '?column?': 1 }]), 1100))
      )
      const r = await healthService.checkDatabase()
      expect(r.status).toBe('warn')
      expect(r.message).toContain('chậm')
    })
  })

  describe('checkRedis', () => {
    it('n/a khi thiếu config', async () => {
      const r = await healthService.checkRedis()
      expect(r.status).toBe('n/a')
    })

    it('ok khi ping thành công', async () => {
      envMock.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
      envMock.UPSTASH_REDIS_REST_TOKEN = 'token'
      fetchMock.mockResolvedValueOnce({ ok: true })
      const r = await healthService.checkRedis()
      expect(r.status).toBe('ok')
    })

    it('fail khi fetch error', async () => {
      envMock.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
      envMock.UPSTASH_REDIS_REST_TOKEN = 'token'
      fetchMock.mockResolvedValueOnce({ ok: false, status: 503 })
      const r = await healthService.checkRedis()
      expect(r.status).toBe('fail')
    })
  })

  describe('checkSepay', () => {
    it('n/a khi thiếu token', async () => {
      const r = await healthService.checkSepay()
      expect(r.status).toBe('n/a')
    })

    it('ok khi API trả 200', async () => {
      envMock.SEPAY_API_TOKEN = 'tok'
      envMock.SEPAY_ACCOUNT_NUMBER = '123456789'
      fetchMock.mockResolvedValueOnce({ ok: true })
      const r = await healthService.checkSepay()
      expect(r.status).toBe('ok')
    })

    it('fail khi API trả 500', async () => {
      envMock.SEPAY_API_TOKEN = 'tok'
      envMock.SEPAY_ACCOUNT_NUMBER = '123456789'
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })
      const r = await healthService.checkSepay()
      expect(r.status).toBe('fail')
    })
  })

  describe('checkEmail', () => {
    it('console → n/a', async () => {
      envMock.EMAIL_PROVIDER = 'console'
      const r = await healthService.checkEmail()
      expect(r.status).toBe('n/a')
    })

    it('resend thiếu key → fail', async () => {
      envMock.EMAIL_PROVIDER = 'resend'
      const r = await healthService.checkEmail()
      expect(r.status).toBe('fail')
    })

    it('resend có key → ok', async () => {
      envMock.EMAIL_PROVIDER = 'resend'
      envMock.RESEND_API_KEY = 're_xxx'
      const r = await healthService.checkEmail()
      expect(r.status).toBe('ok')
    })

    it('ses → n/a (Phase 5+)', async () => {
      envMock.EMAIL_PROVIDER = 'ses'
      const r = await healthService.checkEmail()
      expect(r.status).toBe('n/a')
    })
  })

  describe('checkQueue', () => {
    it('ok + counts', async () => {
      groupByMock.mockResolvedValueOnce([
        { status: 'queued', _count: { _all: 5 } },
        { status: 'sent', _count: { _all: 100 } },
      ])
      const r = await healthService.checkQueue()
      expect(r.status).toBe('ok')
      expect(r.message).toContain('5')
      expect(r.detail).toMatchObject({ queued: 5, sent: 100 })
    })

    it('warn khi failed > 50', async () => {
      groupByMock.mockResolvedValueOnce([
        { status: 'failed', _count: { _all: 60 } },
      ])
      const r = await healthService.checkQueue()
      expect(r.status).toBe('warn')
    })
  })

  describe('checkCron', () => {
    it('returns list registered jobs', async () => {
      const r = await healthService.checkCron()
      expect(r.status).toBe('ok')
      expect(r.message).toContain('sla-scan')
      expect(r.detail).toMatchObject({
        jobs: ['sepay-reconcile', 'expire-overdue-orders', 'sla-scan'],
      })
    })
  })

  describe('runAll', () => {
    it('overall = fail khi có check fail', async () => {
      queryRawMock.mockRejectedValueOnce(new Error('db down'))
      groupByMock.mockResolvedValueOnce([])
      const r = await healthService.runAll()
      expect(r.overall).toBe('fail')
      expect(r.checks.length).toBe(6)
    })

    it('overall = ok khi tất cả ok', async () => {
      queryRawMock.mockResolvedValueOnce([{ '?column?': 1 }])
      groupByMock.mockResolvedValueOnce([
        { status: 'queued', _count: { _all: 2 } },
      ])
      const r = await healthService.runAll()
      // Cron + Email console = n/a → overall = ok
      expect(r.overall).toBe('ok')
    })
  })
})
