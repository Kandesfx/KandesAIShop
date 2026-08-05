'use client'

import { Coins, ShoppingCart, Clock, Users } from 'lucide-react'

interface KpiData {
  revenue: number
  orders: number
  pending: number
  customers: number
  aov: number
}

interface KpiCardsProps {
  data: KpiData
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(cents)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n)
}

export function KpiCards({ data }: KpiCardsProps) {
  const cards = [
    {
      icon: Coins,
      label: 'Doanh thu 30 ngày',
      value: formatCurrency(data.revenue),
      sub: `${data.orders} đơn đã thanh toán`,
      color: 'text-success',
    },
    {
      icon: ShoppingCart,
      label: 'Đơn cần xử lý',
      value: formatNumber(data.pending),
      sub: 'đơn đang chờ',
      color: data.pending > 0 ? 'text-warning' : 'text-ink-200',
    },
    {
      icon: Users,
      label: 'Khách hàng',
      value: formatNumber(data.customers),
      sub: 'tổng cộng',
      color: 'text-electric',
    },
    {
      icon: Coins,
      label: 'Giá trị trung bình',
      value: formatCurrency(data.aov),
      sub: 'mỗi đơn',
      color: 'text-ink-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink-400 border border-ink-400">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-ink-800 p-5">
            <div className="flex items-start justify-between">
              <Icon size={20} strokeWidth={1.5} className={card.color} aria-hidden />
              <span className="text-[10px] font-mono text-ink-200">
                /{String(idx + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-[22px] font-display font-bold text-ink-50 leading-tight">
                {card.value}
              </div>
              <div className="text-[11px] text-ink-100 mt-1">{card.label}</div>
              <div className="text-[10px] text-ink-200 mt-0.5">{card.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
