'use client'

import { useMemo } from 'react'

interface RevenueData {
  date: string
  revenue: number
  orders: number
}

interface RevenueChartProps {
  data: RevenueData[]
}

function formatCurrency(cents: number): string {
  if (cents >= 1000000) {
    return `${(cents / 1000000).toFixed(1)}M`
  }
  if (cents >= 1000) {
    return `${(cents / 1000).toFixed(0)}K`
  }
  return `${cents}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { max: 1, bars: [] }

    const max = Math.max(...data.map((d) => d.revenue), 1)

    const bars = data.map((d) => ({
      ...d,
      height: (d.revenue / max) * 100,
      formatted: formatCurrency(d.revenue),
      label: formatDate(d.date),
    }))

    return { max, bars }
  }, [data])

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0)

  return (
    <div className="border border-ink-400 bg-ink-800/40 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[13px] font-display text-ink-50">Doanh thu 30 ngày</h3>
          <p className="text-[11px] text-ink-200">{formatCurrency(totalRevenue)} · {totalOrders} đơn</p>
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end gap-1 h-32">
        {chartData.bars.map((bar, idx) => (
          <div
            key={bar.date}
            className="flex-1 group relative"
            title={`${bar.label}: ${bar.formatted} (${bar.orders} đơn)`}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-ink-700 text-[10px] text-ink-50 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {bar.label}
              <br />
              {bar.formatted}
            </div>

            {/* Bar */}
            <div
              className="bg-electric/60 hover:bg-electric transition-colors rounded-t-sm"
              style={{ height: `${Math.max(bar.height, 2)}%` }}
            />
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-[9px] text-ink-200 font-mono">
        <span>{chartData.bars[0]?.label}</span>
        <span>{chartData.bars[Math.floor(chartData.bars.length / 2)]?.label}</span>
        <span>{chartData.bars[chartData.bars.length - 1]?.label}</span>
      </div>
    </div>
  )
}
