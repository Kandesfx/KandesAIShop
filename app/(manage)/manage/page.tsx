import { db } from '@/lib/db'
import { KpiCards } from '@/components/admin/dashboard/kpi-cards'
import { RevenueChart } from '@/components/admin/dashboard/revenue-chart'
import { TopProducts } from '@/components/admin/dashboard/top-products'
import { PendingOrders } from '@/components/admin/dashboard/pending-orders'
import { DashboardAlerts } from '@/components/admin/dashboard/alerts'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // Lấy data song song — mỗi fetcher độc lập với try/catch
  const [kpiData, revenueData, topProductsData, pendingOrdersData, alertsData] =
    await Promise.all([
      getKpiData(),
      getRevenueData(),
      getTopProductsData(),
      getPendingOrdersData(),
      getAlertsData(),
    ])

  return (
    <div className="container-narrow py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / DASHBOARD ]
        </span>
        <h1 className="text-display-lg font-display">
          Tổng quan
          <span className="text-electric">.</span>
        </h1>
      </div>

      {/* Alerts */}
      {alertsData.length > 0 && <DashboardAlerts alerts={alertsData} />}

      {/* KPI Cards */}
      <KpiCards data={kpiData} />

      {/* Chart + Top Products row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenueData} />
        <TopProducts data={topProductsData} />
      </div>

      {/* Pending Orders */}
      <PendingOrders data={pendingOrdersData} />
    </div>
  )
}

// ===== Data fetchers — mỗi hàm độc lập với try/catch =====

async function getKpiData() {
  try {
    const now = new Date()
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [revenue, paidOrders, pendingCount, customers] = await Promise.all([
      db.order.aggregate({
        where: {
          status: { in: ['paid', 'delivered', 'completed'] },
          paidAt: { gte: startDate },
        },
        _sum: { totalCents: true },
      }),
      db.order.count({
        where: {
          status: { in: ['paid', 'delivered', 'completed'] },
          paidAt: { gte: startDate },
        },
      }),
      db.order.count({
        where: { status: { in: ['pending', 'paid', 'processing'] } },
      }),
      db.user.count({ where: { role: 'customer', deletedAt: null } }),
    ])

    const revenueCents = Number(revenue._sum.totalCents ?? 0)
    const aov = paidOrders > 0 ? Math.round(revenueCents / paidOrders) : 0

    return { revenue: revenueCents, orders: paidOrders, pending: pendingCount, customers, aov }
  } catch {
    return { revenue: 0, orders: 0, pending: 0, customers: 0, aov: 0 }
  }
}

async function getRevenueData() {
  try {
    const now = new Date()
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const orders = await db.order.findMany({
      where: {
        status: { in: ['paid', 'delivered', 'completed'] },
        paidAt: { gte: startDate },
      },
      select: { paidAt: true, totalCents: true },
    })

    const byDay = new Map<string, { revenue: number; count: number }>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split('T')[0] ?? ''
      byDay.set(dateStr, { revenue: 0, count: 0 })
    }

    for (const o of orders) {
      if (o.paidAt) {
        const dateStr = o.paidAt.toISOString().split('T')[0] ?? ''
        const existing = byDay.get(dateStr)
        if (existing) {
          existing.revenue += Number(o.totalCents)
          existing.count += 1
        }
      }
    }

    return Array.from(byDay.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.count,
    }))
  } catch {
    return []
  }
}

async function getTopProductsData() {
  try {
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
      orderBy: { _sum: { totalPriceCents: 'desc' } },
      take: 5,
    })

    const productIds = results.map((r) => r.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        media: { take: 1, select: { url: true } },
      },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    return results.map((r) => {
      const p = productMap.get(r.productId)
      return {
        id: r.productId,
        name: p?.name ?? 'Unknown',
        slug: p?.slug ?? null,
        imageUrl: p?.media[0]?.url ?? null,
        quantity: r._sum.quantity ?? 0,
        revenue: Number(r._sum.totalPriceCents ?? 0),
      }
    })
  } catch {
    return []
  }
}

async function getPendingOrdersData() {
  try {
    const orders = await db.order.findMany({
      where: { status: { in: ['pending', 'paid', 'processing'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalCents: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    })

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.totalCents),
      createdAt: o.createdAt.toISOString(),
      customer: o.user?.name ?? 'Khách',
    }))
  } catch {
    return []
  }
}

async function getAlertsData() {
  try {
    const alerts: { type: 'warning' | 'error' | 'info'; message: string; href?: string }[] = []

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const oldPending = await db.order.count({
      where: { status: 'pending', createdAt: { lt: oneHourAgo } },
    })
    if (oldPending > 0) {
      alerts.push({ type: 'warning', message: `${oldPending} đơn pending > 1 giờ` })
    }

    const paidNotDelivered = await db.order.count({ where: { status: 'paid' } })
    if (paidNotDelivered > 0) {
      alerts.push({ type: 'warning', message: `${paidNotDelivered} đơn đã trả chưa giao` })
    }

    const pendingReviews = await db.review.count({ where: { status: 'pending' } })
    if (pendingReviews > 0) {
      alerts.push({
        type: 'info',
        message: `${pendingReviews} review chờ duyệt`,
        href: '/manage/reviews',
      })
    }

    return alerts
  } catch {
    return []
  }
}
