/**
 * Dashboard service — P4-01.
 *
 * Cung cấp data cho admin dashboard:
 * - KPI cards (doanh thu, đơn hàng, AOV)
 * - Chart doanh thu 30 ngày
 * - Top sản phẩm
 * - Đơn cần xử lý
 */

import { db } from '@/lib/db'

// Số liệu tổng quan
export async function getKpiStats(days: number = 30) {
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  const [
    totalRevenue,
    totalOrders,
    pendingOrders,
    totalCustomers,
  ] = await Promise.all([
    // Doanh thu (orders đã paid)
    db.order.aggregate({
      where: {
        status: { in: ['paid', 'delivered', 'completed'] },
        paidAt: { gte: startDate },
      },
      _sum: { totalCents: true },
    }),

    // Tổng đơn đã thanh toán
    db.order.count({
      where: {
        status: { in: ['paid', 'delivered', 'completed'] },
        paidAt: { gte: startDate },
      },
    }),

    // Đơn đang chờ xử lý
    db.order.count({
      where: {
        status: { in: ['pending', 'paid', 'processing'] },
      },
    }),

    // Tổng khách hàng
    db.user.count({
      where: { role: 'customer', deletedAt: null },
    }),
  ])

  const revenue = Number(totalRevenue._sum.totalCents ?? 0)
  const orderCount = totalOrders
  const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0

  return {
    revenueCents: revenue,
    revenueFormatted: formatCurrency(revenue),
    totalOrders: orderCount,
    pendingOrders,
    totalCustomers,
    aovCents: aov,
    aovFormatted: formatCurrency(aov),
    period: days,
  }
}

// Doanh thu theo ngày (30 ngày gần nhất)
export async function getRevenueByDay(days: number = 30) {
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Query từng ngày
  const orders = await db.order.findMany({
    where: {
      status: { in: ['paid', 'delivered', 'completed'] },
      paidAt: { gte: startDate },
    },
    select: {
      paidAt: true,
      totalCents: true,
    },
  })

  // Group by day
  const byDay = new Map<string, { revenue: number; count: number }>()

  // Khởi tạo tất cả ngày
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split('T')[0] ?? ''
    byDay.set(key, { revenue: 0, count: 0 })
  }

  // Điền data
  for (const order of orders) {
    if (order.paidAt) {
      const key = order.paidAt.toISOString().split('T')[0] ?? ''
      const existing = byDay.get(key)
      if (existing) {
        existing.revenue += Number(order.totalCents)
        existing.count += 1
      }
    }
  }

  // Convert to array
  const result = Array.from(byDay.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    revenueFormatted: formatCurrency(data.revenue),
    orders: data.count,
  }))

  return result
}

// Top sản phẩm
export async function getTopProducts(limit: number = 5) {
  const now = new Date()
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const results = await db.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        status: { in: ['paid', 'delivered', 'completed'] },
        paidAt: { gte: startDate },
      },
    },
    _sum: { quantity: true, totalPriceCents: true },
    _count: true,
    orderBy: { _sum: { totalPriceCents: 'desc' } },
    take: limit,
  })

  // Lấy product info
  const productIds = results.map((r) => r.productId)
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true, media: { take: 1, select: { url: true } } },
  })

  const productMap = new Map(products.map((p) => [p.id, p]))

  return results.map((r) => {
    const product = productMap.get(r.productId)
    const revenue = Number(r._sum.totalPriceCents ?? 0)
    return {
      productId: r.productId,
      productName: product?.name ?? 'Unknown',
      productSlug: product?.slug ?? null,
      imageUrl: product?.media[0]?.url ?? null,
      quantitySold: r._sum.quantity ?? 0,
      revenueCents: revenue,
      orderCount: r._count,
    }
  })
}

// Đơn cần xử lý
export async function getPendingOrders(limit: number = 10) {
  const orders = await db.order.findMany({
    where: {
      status: { in: ['pending', 'paid', 'processing'] },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      totalCents: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      items: {
        select: { quantity: true },
        take: 1,
      },
    },
  })

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    totalCents: Number(o.totalCents),
    totalFormatted: formatCurrency(Number(o.totalCents)),
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: o.createdAt.toISOString(),
    customerName: o.user?.name ?? 'Khách',
    customerEmail: o.user?.email,
  }))
}

// Alerts cho admin
export async function getAlerts() {
  const alerts: { type: 'warning' | 'error' | 'info'; message: string; count: number }[] = []

  // Đơn pending > 1h
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const oldPending = await db.order.count({
    where: {
      status: 'pending',
      createdAt: { lt: oneHourAgo },
    },
  })
  if (oldPending > 0) {
    alerts.push({
      type: 'warning',
      message: `Có ${oldPending} đơn pending > 1 giờ`,
      count: oldPending,
    })
  }

  // Đơn đã thanh toán nhưng chưa giao
  const paidNotDelivered = await db.order.count({
    where: {
      status: 'paid',
    },
  })
  if (paidNotDelivered > 0) {
    alerts.push({
      type: 'warning',
      message: `Có ${paidNotDelivered} đơn đã trả nhưng chưa giao`,
      count: paidNotDelivered,
    })
  }

  // Reviews pending duyệt
  const pendingReviews = await db.review.count({
    where: { status: 'pending' },
  })
  if (pendingReviews > 0) {
    alerts.push({
      type: 'info',
      message: `Có ${pendingReviews} review chờ duyệt`,
      count: pendingReviews,
    })
  }

  // Hết hàng
  const outOfStock = await db.product.count({
    where: { stockStatus: 'out_of_stock', isPublished: true },
  })
  if (outOfStock > 0) {
    alerts.push({
      type: 'error',
      message: `Có ${outOfStock} sản phẩm hết hàng`,
      count: outOfStock,
    })
  }

  return alerts
}

// Helper format tiền
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(cents)
}

export const dashboardService = {
  getKpiStats,
  getRevenueByDay,
  getTopProducts,
  getPendingOrders,
  getAlerts,
}
