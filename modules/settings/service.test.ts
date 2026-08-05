import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Settings service unit tests — P4-06.
 *
 * Mock `@/lib/db` để service chạy pure logic mà không cần DB thật.
 * Mock `@/lib/logger` để verify sensitive value KHÔNG bị log.
 */

// Mock Prisma trước khi import service.
const findManyMock = vi.fn()
const findUniqueMock = vi.fn()
const upsertMock = vi.fn()
const createMock = vi.fn()
const auditLogCreateMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    setting: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => auditLogCreateMock(...args),
    },
    $transaction: (ops: unknown[]) => Promise.all(ops),
  },
}))

const loggerInfoMock = vi.fn()
vi.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  settingsService,
  __testing,
} from './service'

beforeEach(() => {
  findManyMock.mockReset()
  findUniqueMock.mockReset()
  upsertMock.mockReset()
  createMock.mockReset()
  auditLogCreateMock.mockReset()
  loggerInfoMock.mockReset()
  upsertMock.mockResolvedValue({ key: 'x', value: 'y' })
  auditLogCreateMock.mockResolvedValue({ id: 'log' })
})

describe('settings service — P4-06', () => {
  describe('getCategory', () => {
    it('returns merged default + stored values, mask sensitive', async () => {
      findManyMock.mockResolvedValueOnce([
        { key: 'shop.name', value: 'Kandes Custom', category: 'general' },
        {
          key: 'payment.sepayApiToken',
          value: 'super-secret-token-abc',
          category: 'payment',
        },
      ])

      const view = await settingsService.getCategory('payment')

      expect(view.category).toBe('payment')
      expect(view.fields.length).toBeGreaterThan(0)
      // Token trong DB phải bị mask khi trả ra UI.
      expect(view.values['payment.sepayApiToken']).toBe('••••••••')
      // Default từ registry.
      expect(view.values['payment.sepayQrTemplate']).toBe('compact2')
    })

    it('throws NotFoundError cho category không tồn tại', async () => {
      findManyMock.mockResolvedValueOnce([])
      await expect(settingsService.getCategory('invalid-cat')).rejects.toThrow(
        /Category không tồn tại/
      )
    })
  })

  describe('updateCategory', () => {
    it('writes rows, ghi auditLog, không log raw sensitive value', async () => {
      await settingsService.updateCategory(
        'payment',
        {
          'payment.sepayApiToken': 'new-secret-xyz',
          'payment.sepayBankCode': 'TCB',
        },
        { id: 'admin-1' }
      )

      // Cả 2 keys đều được upsert (1 sensitive, 1 không).
      expect(upsertMock).toHaveBeenCalledTimes(2)
      expect(auditLogCreateMock).toHaveBeenCalledTimes(1)

      // Audit log payload KHÔNG chứa raw value của sensitive key.
      const auditCall = auditLogCreateMock.mock.calls[0]?.[0] as
        | { data: { payload: { keys: string[]; safeKeys: string[] } } }
        | undefined
      expect(auditCall).toBeDefined()
      const payload = auditCall!.data.payload
      expect(payload.keys).toContain('payment.sepayApiToken')
      expect(payload.safeKeys).not.toContain('payment.sepayApiToken')
      expect(payload.safeKeys).toContain('payment.sepayBankCode')

      // Logger.info KHÔNG chứa raw sensitive value.
      expect(loggerInfoMock).toHaveBeenCalled()
      const logArgs = loggerInfoMock.mock.calls[0]
      const serialized = JSON.stringify(logArgs)
      expect(serialized).not.toContain('new-secret-xyz')
    })

    it('skips sensitive key khi value rỗng (giữ nguyên trong DB)', async () => {
      const result = await settingsService.updateCategory(
        'payment',
        {
          'payment.sepayApiToken': '',
          'payment.sepayBankCode': 'VCB',
        },
        { id: 'admin-1' }
      )

      expect(result.skipped).toBe(1)
      expect(result.updated).toBe(1)
      // Chỉ 1 upsert (VCB) — token rỗng bị skip.
      expect(upsertMock).toHaveBeenCalledTimes(1)
    })

    it('throws NotFoundError cho category invalid', async () => {
      await expect(
        settingsService.updateCategory('nope', {}, { id: 'admin-1' })
      ).rejects.toThrow(/Category không tồn tại/)
    })
  })

  describe('seedDefaults', () => {
    it('idempotent — gọi 2 lần, lần 2 inserted = 0', async () => {
      findManyMock.mockResolvedValueOnce([]) // existing rows = none
      const first = await settingsService.seedDefaults()
      expect(first.inserted).toBeGreaterThan(0)
      expect(createMock).toHaveBeenCalledTimes(first.inserted)

      // Capture actual keys đã insert để mock lại existing rows.
      const insertedKeys = createMock.mock.calls.map(
        (call) => (call[0] as { data: { key: string } }).data.key
      )
      expect(insertedKeys.length).toBe(first.inserted)

      createMock.mockReset()
      // Lần 2: existing rows = tất cả keys vừa insert
      findManyMock.mockResolvedValueOnce(
        insertedKeys.map((key) => ({ key }))
      )
      const second = await settingsService.seedDefaults()
      expect(second.inserted).toBe(0)
    })
  })

  describe('maskValue helper', () => {
    it('mask non-empty string khi sensitive=true', () => {
      expect(__testing.maskValue('abc', true)).toBe('••••••••')
    })
    it('giữ nguyên empty/null khi sensitive=true (để caller check skip)', () => {
      expect(__testing.maskValue('', true)).toBe('')
      expect(__testing.maskValue(null, true)).toBe(null)
    })
    it('không mask khi sensitive=false', () => {
      expect(__testing.maskValue('hello', false)).toBe('hello')
      expect(__testing.maskValue(42, false)).toBe(42)
    })
  })
})
