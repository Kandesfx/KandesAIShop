import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import type {
  ReportRange,
  ReportRangePreset,
  RevenueBucket,
  RevenueReport,
  InventoryReport,
  TopProductsReport,
} from './types'

/**
 * Reports service — P4-07.
 *
 * In-process recompute mỗi request (D31 — MVP). Phase 5+ có thể cache hoặc
 * pre-aggregate (materialized view / daily cron) nếu dataset lớn.
 *
 * Quy ước:
 *   - KHÔNG validate (route đã parseInput).
 *   - Money trả ra dưới dạng string (BigInt serialized) để tránh mất precision.
 *   - Dùng raw SQL group by date cho revenue chart — Prisma không support
 *     date_trunc đơn giản nên viết query gọn.
 */

export type RangeInput = {
  preset: ReportRangePreset
  from?: string
  to?: string
}

export function resolveRange(input: RangeInput): ReportRange {
  if (input.preset === 'custom') {
    return {
      preset: 'custom',
      from: input.from!,
      to: input.to!,
    }
  }
  const now = new Date()
  const to = now
  let from = new Date(now)
  switch (input.preset) {
    case '7d':
      from.setDate(now.getDate() - 7)
      break
    case '30d':
      from.setDate(now.getDate() - 30)
      break
    case '90d':
      from.setDate(now.getDate() - 90)
      break
    case 'mtd': {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    }
    case 'qtd': {
      const q = Math.floor(now.getMonth() / 3) * 3
      from = new Date(now.getFullYear(), q, 1)
      break
    }
    case 'ytd':
      from = new Date(now.getFullYear(), 0, 1)
      break
  }
  return {
    preset: input.preset,
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Build empty daily buckets giữa from/to để chart không bị gap. */
function buildEmptyBuckets(from: Date, to: Date): RevenueBucket[] {
  const buckets: RevenueBucket[] = []
  // Dùng UTC date components để tránh lệch timezone khi chạy ở server ở các region khác nhau.
  const startY = from.getUTCFullYear()
  const startM = from.getUTCMonth()
  const startD = from.getUTCDate()
  const endY = to.getUTCFullYear()
  const endM = to.getUTCMonth()
  const endD = to.getUTCDate()
  const cur = new Date(Date.UTC(startY, startM, startD))
  const end = new Date(Date.UTC(endY, endM, endD))
  while (cur <= end) {
    buckets.push({
      date: formatDateKeyUtc(cur),
      orderCount: 0,
      grossCents: '0',
      netCents: '0',
    })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return buckets
}

function formatDateKeyUtc(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Revenue report — sum gross/discount/net theo paid orders trong range.
 * Group theo ngày (date_trunc).
 */
export async function getRevenueReport(range: ReportRange): Promise<RevenueReport> {
  const from = new Date(range.from)
  const to = new Date(range.to)

  const [totals, dailyRows, paymentRows] = await Promise.all([
    db.order.aggregate({
      _count: { _all: true },
      _sum: {
        totalCents: true,
        discountCents: true,
        subtotalCents: true,
      },
      where: {
        paymentStatus: 'paid',
        paidAt: { gte: from, lte: to },
      },
    }),
    db.$queryRaw<Array<{ day: Date; order_count: bigint; gross: bigint; net: bigint }>>`
      SELECT
        date_trunc('day', paid_at)::date AS day,
        COUNT(*)::bigint                  AS order_count,
        SUM(total_cents)::bigint          AS gross,
        SUM(total_cents - discount_cents)::bigint AS net
      FROM orders
      WHERE payment_status = 'paid'
        AND paid_at >= ${from}::timestamptz
        AND paid_at <= ${to}::timestamptz
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    db.order.groupBy({
      by: ['paymentMethod'],
      where: {
        paymentStatus: 'paid',
        paidAt: { gte: from, lte: to },
      },
      _count: { _all: true },
      _sum: { totalCents: true, discountCents: true },
    }),
  ])

  const totalOrders = totals._count._all
  const gross = totals._sum.totalCents ?? 0n
  const discount = totals._sum.discountCents ?? 0n
  const net = gross - discount > 0n ? gross - discount : 0n

  // Refund = sum total_cents của orders cancelled sau khi paid, hoặc refunded
  const refundAgg = await db.order.aggregate({
    _sum: { totalCents: true },
    where: {
      OR: [
        { status: 'refunded' },
        { status: 'cancelled', refundedAt: { not: null } },
      ],
      refundedAt: { gte: from, lte: to },
    },
  })
  const refund = refundAgg._sum.totalCents ?? 0n

  const avg =
    totalOrders > 0
      ? net / BigInt(totalOrders)
      : 0n

  const bucketsMap = new Map<string, RevenueBucket>()
  for (const r of dailyRows) {
    const key = formatDateKeyUtc(new Date(r.day))
    bucketsMap.set(key, {
      date: key,
      orderCount: Number(r.order_count),
      grossCents: r.gross.toString(),
      netCents: r.net.toString(),
    })
  }
  // Merge với empty buckets để chart không bị gap ngày không có order
  const buckets: RevenueBucket[] = []
  for (const empty of buildEmptyBuckets(from, to)) {
    buckets.push(bucketsMap.get(empty.date) ?? empty)
  }

  const byPaymentMethod = paymentRows.map((p) => {
    const sumGross = p._sum.totalCents ?? 0n
    const sumDisc = p._sum.discountCents ?? 0n
    return {
      method: p.paymentMethod,
      orderCount: p._count._all,
      netCents: (sumGross - sumDisc > 0n ? sumGross - sumDisc : 0n).toString(),
    }
  })

  return {
    range,
    totals: {
      orderCount: totalOrders,
      grossCents: gross.toString(),
      discountCents: discount.toString(),
      netCents: net.toString(),
      refundCents: refund.toString(),
      avgOrderCents: avg.toString(),
    },
    buckets,
    byPaymentMethod,
  }
}

/**
 * Inventory report — đếm inventory items theo status, group theo product.
 * Low-stock product = available < lowStockThreshold (admin config).
 */
export async function getInventoryReport(lowStockThreshold: number): Promise<InventoryReport> {
  const [statusGroups, productGroups, productsCount] = await Promise.all([
    db.inventoryItem.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    db.$queryRaw<
      Array<{
        product_id: string
        product_name: string
        product_sku: string
        available: bigint
        reserved: bigint
        delivered: bigint
        total: bigint
      }>
    >`
      SELECT
        p.id                            AS product_id,
        p.name                          AS product_name,
        p.sku                           AS product_sku,
        COUNT(*) FILTER (WHERE i.status = 'available')::bigint AS available,
        COUNT(*) FILTER (WHERE i.status = 'reserved')::bigint  AS reserved,
        COUNT(*) FILTER (WHERE i.status = 'delivered')::bigint AS delivered,
        COUNT(*)::bigint                AS total
      FROM products p
      LEFT JOIN inventory_items i ON i.product_id = p.id
      WHERE p.deleted_at IS NULL
      GROUP BY p.id, p.name, p.sku
      ORDER BY available ASC, p.name ASC
    `,
    db.product.count({ where: { deletedAt: null } }),
  ])

  const findStatus = (s: string) =>
    statusGroups.find((g) => g.status === s)?._count._all ?? 0

  const byProduct = productGroups.map((p) => {
    const available = Number(p.available)
    return {
      productId: p.product_id,
      productName: p.product_name,
      productSku: p.product_sku,
      available,
      reserved: Number(p.reserved),
      delivered: Number(p.delivered),
      total: Number(p.total),
      lowStockThreshold,
      isLowStock: available < lowStockThreshold,
    }
  })

  return {
    totals: {
      products: productsCount,
      itemsAvailable: findStatus('available'),
      itemsReserved: findStatus('reserved'),
      itemsDelivered: findStatus('delivered'),
      itemsExpired: findStatus('expired'),
      lowStockProducts: byProduct.filter((p) => p.isLowStock).length,
    },
    byProduct,
  }
}

/**
 * Top products — aggregate từ OrderItem trong range theo paid orders.
 */
export async function getTopProductsReport(
  range: ReportRange,
  limit: number
): Promise<TopProductsReport> {
  const from = new Date(range.from)
  const to = new Date(range.to)

  const rows = await db.$queryRaw<
    Array<{
      product_id: string
      product_name: string
      product_sku: string
      quantity_sold: bigint
      gross: bigint
      order_count: bigint
    }>
  >`
    SELECT
      oi.product_id,
      oi.product_name_snapshot AS product_name,
      oi.product_sku_snapshot  AS product_sku,
      SUM(oi.quantity)::bigint                       AS quantity_sold,
      SUM(oi.total_price_cents)::bigint              AS gross,
      COUNT(DISTINCT oi.order_id)::bigint            AS order_count
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    WHERE o.payment_status = 'paid'
      AND o.paid_at >= ${from}::timestamptz
      AND o.paid_at <= ${to}::timestamptz
    GROUP BY oi.product_id, oi.product_name_snapshot, oi.product_sku_snapshot
    ORDER BY gross DESC
    LIMIT ${limit}
  `

  return {
    range,
    limit,
    items: rows.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      productSku: r.product_sku,
      quantitySold: Number(r.quantity_sold),
      grossCents: r.gross.toString(),
      orderCount: Number(r.order_count),
    })),
  }
}

/** Helper: build CSV từ rows. Trả về Buffer để route handler set Content-Type. */
export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines: string[] = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(row.map(escape).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

export const reportsService = {
  resolveRange,
  getRevenueReport,
  getInventoryReport,
  getTopProductsReport,
  toCsv,
}

// Suppress unused warning for logger nếu chưa cần (giữ cho parity với service khác)
void logger
