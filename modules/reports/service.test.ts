import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Reports service unit tests — P4-07.
 * Mock `@/lib/db` — KHÔNG touch real Prisma.
 */

const aggregateMock = vi.fn()
const groupByMock = vi.fn()
const countMock = vi.fn()
const queryRawMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    order: {
      aggregate: (...args: unknown[]) => aggregateMock(...args),
      groupBy: (...args: unknown[]) => groupByMock(...args),
    },
    inventoryItem: {
      groupBy: (...args: unknown[]) => groupByMock(...args),
    },
    product: {
      count: (...args: unknown[]) => countMock(...args),
    },
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}))

import { reportsService } from './service'

beforeEach(() => {
  aggregateMock.mockReset()
  groupByMock.mockReset()
  countMock.mockReset()
  queryRawMock.mockReset()
})

describe('reports service — P4-07', () => {
  describe('resolveRange', () => {
    it('30d preset trả khoảng 30 ngày', () => {
      const r = reportsService.resolveRange({ preset: '30d' })
      const days = (new Date(r.to).getTime() - new Date(r.from).getTime()) / 86400_000
      expect(days).toBeGreaterThanOrEqual(29)
      expect(days).toBeLessThanOrEqual(31)
    })

    it('mtd preset trả về đầu tháng', () => {
      const r = reportsService.resolveRange({ preset: 'mtd' })
      const from = new Date(r.from)
      expect(from.getDate()).toBe(1)
      expect(from.getHours()).toBe(0)
    })

    it('custom yêu cầu from + to', () => {
      const r = reportsService.resolveRange({
        preset: 'custom',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.999Z',
      })
      expect(r.from).toBe('2026-01-01T00:00:00.000Z')
      expect(r.to).toBe('2026-01-31T23:59:59.999Z')
    })
  })

  describe('getRevenueReport', () => {
    it('aggregate totals + daily + byPaymentMethod', async () => {
      aggregateMock.mockResolvedValueOnce({
        _count: { _all: 5 },
        _sum: { totalCents: 5000000n, discountCents: 500000n, subtotalCents: 5500000n },
      })
      queryRawMock.mockResolvedValueOnce([
        { day: new Date('2026-01-15T00:00:00Z'), order_count: 3n, gross: 3000000n, net: 2700000n },
        { day: new Date('2026-01-16T00:00:00Z'), order_count: 2n, gross: 2000000n, net: 1800000n },
      ])
      groupByMock.mockResolvedValueOnce([
        {
          paymentMethod: 'sepay',
          _count: { _all: 5 },
          _sum: { totalCents: 5000000n, discountCents: 500000n },
        },
      ])
      // Refund aggregate (call thứ 2)
      aggregateMock.mockResolvedValueOnce({ _sum: { totalCents: 100000n } })

      // Cùng ngày → 1 bucket duy nhất
      const range = {
        preset: 'custom' as const,
        from: '2026-01-15T00:00:00.000Z',
        to: '2026-01-15T23:59:59.999Z',
      }
      const report = await reportsService.getRevenueReport(range)

      expect(report.totals.orderCount).toBe(5)
      expect(report.totals.grossCents).toBe('5000000')
      expect(report.totals.netCents).toBe('4500000')
      expect(report.totals.refundCents).toBe('100000')
      expect(report.totals.avgOrderCents).toBe('900000')
      // Cùng 1 ngày → 1 bucket
      expect(report.buckets.length).toBe(1)
      expect(report.byPaymentMethod[0]?.method).toBe('sepay')
      expect(report.byPaymentMethod[0]?.netCents).toBe('4500000')
    })

    it('avgOrderCents = 0 khi không có order', async () => {
      aggregateMock.mockResolvedValueOnce({
        _count: { _all: 0 },
        _sum: { totalCents: null, discountCents: null, subtotalCents: null },
      })
      queryRawMock.mockResolvedValueOnce([])
      groupByMock.mockResolvedValueOnce([])
      aggregateMock.mockResolvedValueOnce({ _sum: { totalCents: null } })

      // Range trong cùng 1 ngày (UTC) → 1 bucket
      const range = {
        preset: 'custom' as const,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-01T12:00:00.000Z',
      }
      const report = await reportsService.getRevenueReport(range)

      expect(report.totals.orderCount).toBe(0)
      expect(report.totals.netCents).toBe('0')
      expect(report.totals.avgOrderCents).toBe('0')
      expect(report.buckets.length).toBe(1)
    })
  })

  describe('getInventoryReport', () => {
    it('group theo status + product, tính lowStockProducts', async () => {
      groupByMock.mockResolvedValueOnce([
        { status: 'available', _count: { _all: 10 } },
        { status: 'reserved', _count: { _all: 2 } },
        { status: 'delivered', _count: { _all: 5 } },
        { status: 'expired', _count: { _all: 1 } },
      ])
      queryRawMock.mockResolvedValueOnce([
        {
          product_id: 'p1',
          product_name: 'Cursor Pro',
          product_sku: 'CRS-PRO',
          available: 3n,
          reserved: 1n,
          delivered: 2n,
          total: 6n,
        },
        {
          product_id: 'p2',
          product_name: 'Windsurf',
          product_sku: 'WND-PRO',
          available: 20n,
          reserved: 1n,
          delivered: 3n,
          total: 24n,
        },
      ])
      countMock.mockResolvedValueOnce(2)

      const report = await reportsService.getInventoryReport(5)

      expect(report.totals.itemsAvailable).toBe(10)
      expect(report.totals.itemsReserved).toBe(2)
      expect(report.totals.lowStockProducts).toBe(1) // p1 có available=3 < 5
      expect(report.byProduct[0]?.isLowStock).toBe(true)
      expect(report.byProduct[1]?.isLowStock).toBe(false)
    })
  })

  describe('getTopProductsReport', () => {
    it('aggregate quantity + gross + orderCount', async () => {
      queryRawMock.mockResolvedValueOnce([
        {
          product_id: 'p1',
          product_name: 'Cursor Pro',
          product_sku: 'CRS-PRO',
          quantity_sold: 50n,
          gross: 1200000000n,
          order_count: 30n,
        },
      ])

      const range = {
        preset: 'custom' as const,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.999Z',
      }
      const report = await reportsService.getTopProductsReport(range, 10)

      expect(report.limit).toBe(10)
      expect(report.items[0]?.grossCents).toBe('1200000000')
      expect(report.items[0]?.quantitySold).toBe(50)
      expect(report.items[0]?.orderCount).toBe(30)
    })
  })

  describe('toCsv', () => {
    it('escape quotes + newlines, thêm CRLF rows', () => {
      const csv = reportsService.toCsv(
        ['name', 'note'],
        [
          ['Cursor Pro', 'Hello'],
          ['Windsurf, v2', 'has "quote"'],
          ['Multi\nline', null],
        ]
      )
      expect(csv.split('\r\n').length).toBe(5) // 1 header + 3 rows + 1 empty
      expect(csv).toContain('"Windsurf, v2"')
      expect(csv).toContain('"has ""quote"""')
      expect(csv).toContain('"Multi\nline"')
    })
  })
})
