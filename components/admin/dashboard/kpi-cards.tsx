'use client'

import { DollarSign, ShoppingBag, Users, BarChart3, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n)
}

export function KpiCards({ data }: KpiCardsProps) {
  const cards = [
    {
      icon: DollarSign,
      label: 'Doanh thu 30 ngày',
      value: formatCurrency(data.revenue),
      sub: `${data.orders} đơn hoàn tất`,
      badge: 'Tháng này',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      href: '/manage/reports/revenue',
    },
    {
      icon: ShoppingBag,
      label: 'Đơn cần xử lý',
      value: `${formatNumber(data.pending)} đơn`,
      sub: data.pending > 0 ? 'Cần giao hàng ngay' : 'Đã xử lý hết',
      badge: data.pending > 0 ? 'CẦN XỬ LÝ' : 'ỔN ĐỊNH',
      badgeColor: data.pending > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' : 'bg-ink-700 text-ink-100 border-ink-400',
      iconBg: data.pending > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-ink-700 text-ink-100 border-ink-400',
      href: '/manage/orders?status=processing',
    },
    {
      icon: Users,
      label: 'Khách hàng',
      value: `${formatNumber(data.customers)}`,
      sub: 'Tài khoản đăng ký',
      badge: 'Tổng số',
      badgeColor: 'bg-electric/10 text-electric border-electric/30',
      iconBg: 'bg-electric/10 text-electric border-electric/30',
      href: '/manage/users',
    },
    {
      icon: BarChart3,
      label: 'Giá trị TB / Đơn (AOV)',
      value: formatCurrency(data.aov),
      sub: 'Tính trên đơn thành công',
      badge: 'Trung bình',
      badgeColor: 'bg-plasma/10 text-purple-400 border-purple-500/30',
      iconBg: 'bg-plasma/10 text-purple-400 border-purple-500/30',
      href: '/manage/reports/revenue',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link
            key={card.label}
            href={card.href}
            className="group bg-ink-800/70 hover:bg-ink-800 border border-ink-400 hover:border-electric/50 p-5 rounded-lg transition-all duration-200 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${card.iconBg}`}>
                  <Icon size={20} strokeWidth={2} />
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>
              <div className="mt-4">
                <div className="text-[13px] text-ink-100 font-medium">{card.label}</div>
                <div className="text-[22px] font-display font-bold text-ink-50 leading-tight mt-1 group-hover:text-electric transition-colors">
                  {card.value}
                </div>
              </div>
            </div>
            <div className="text-[12px] text-ink-100 mt-3 pt-3 border-t border-ink-400/50 flex items-center justify-between">
              <span>{card.sub}</span>
              <span className="text-electric group-hover:translate-x-0.5 transition-transform text-[11px]">→</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
