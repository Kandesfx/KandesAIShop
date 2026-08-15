import { db } from '@/lib/db'
import { CouponsClient } from '@/components/admin/coupons/coupons-client'

export const dynamic = 'force-dynamic'

export default async function AdminCouponsPage() {
  // Lấy initial data
  const [coupons, total] = await Promise.all([
    db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.coupon.count(),
  ])

  const initialCoupons = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type as 'percent' | 'fixed',
    value: c.value,
    minOrderCents: c.minOrderCents.toString(),
    maxDiscountCents: c.maxDiscountCents?.toString() ?? null,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    maxUsesPerUser: c.maxUsesPerUser,
    startsAt: c.startsAt.toISOString(),
    expiresAt: c.expiresAt.toISOString(),
    isActive: c.isActive,
  }))

  return (
    <div className="container-narrow py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / COUPONS ]
        </span>
        <h1 className="text-display-lg font-display">
          Coupons
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">
          Quản lý mã giảm giá
        </p>
      </div>

      {/* Coupons List */}
      <CouponsClient initialCoupons={initialCoupons} total={total} />
    </div>
  )
}
