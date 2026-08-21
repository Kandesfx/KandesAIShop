'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, Calendar } from 'lucide-react'

interface RevenueData {
  date: string
  revenue: number
  orders: number
}

interface RevenueChartProps {
  data: RevenueData[]
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCompactVND(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} tỷ`
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} tr`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k`
  }
  return `${amount}đ`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `Ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const chartData = useMemo(() => {
    if (data.length === 0) return { max: 1, bars: [] }

    const max = Math.max(...data.map((d) => d.revenue), 1)

    const bars = data.map((d, idx) => ({
      ...d,
      height: (d.revenue / max) * 100,
      formatted: formatVND(d.revenue),
      compact: formatCompactVND(d.revenue),
      label: formatDate(d.date),
      fullDate: formatFullDate(d.date),
      idx,
    }))

    return { max, bars }
  }, [data])

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0)

  const activeBar = hoveredIdx !== null ? chartData.bars[hoveredIdx] : null

  return (
    <div className="border border-ink-400 bg-ink-800/60 p-6 rounded-lg shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-electric/10 text-electric flex items-center justify-center border border-electric/30">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="text-[14px] font-display font-semibold text-ink-50">Doanh thu 30 ngày qua</h3>
              <div className="text-[12px] text-ink-100 flex items-center gap-1.5 mt-0.5">
                <Calendar size={12} />
                <span>Tổng: <strong className="text-electric">{formatVND(totalRevenue)}</strong> · <strong>{totalOrders}</strong> đơn thành công</span>
              </div>
            </div>
          </div>

          {/* Active Highlight preview */}
          {activeBar && (
            <div className="hidden sm:block text-right bg-ink-900 px-3 py-1.5 rounded border border-ink-400">
              <div className="text-[11px] text-ink-100">{activeBar.fullDate}</div>
              <div className="text-[13px] font-bold text-electric font-mono">
                {activeBar.formatted} ({activeBar.orders} đơn)
              </div>
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-1.5 h-36 pt-4 pb-2 border-b border-ink-400/50">
          {chartData.bars.map((bar) => {
            const isHovered = hoveredIdx === bar.idx
            return (
              <div
                key={bar.date}
                className="flex-1 group relative flex flex-col items-center h-full justify-end"
                onMouseEnter={() => setHoveredIdx(bar.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Floating Tooltip */}
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-ink-950 border border-ink-400 text-ink-50 text-[11px] rounded shadow-xl pointer-events-none z-20 whitespace-nowrap transition-all duration-150 ${
                    isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="font-semibold text-ink-50">{bar.fullDate}</div>
                  <div className="text-electric font-mono font-bold mt-0.5">{bar.formatted}</div>
                  <div className="text-ink-100 text-[10px]">{bar.orders} đơn hàng</div>
                </div>

                {/* Bar Element */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 cursor-pointer ${
                    bar.revenue === 0
                      ? 'bg-ink-700/40 hover:bg-ink-700'
                      : isHovered
                      ? 'bg-electric shadow-[0_0_12px_rgba(0,229,255,0.6)]'
                      : 'bg-electric/60 hover:bg-electric'
                  }`}
                  style={{ height: `${Math.max(bar.height, 4)}%` }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-3 text-[11px] text-ink-100 font-mono">
        <span>{chartData.bars[0]?.label}</span>
        <span>{chartData.bars[Math.floor(chartData.bars.length / 2)]?.label}</span>
        <span>{chartData.bars[chartData.bars.length - 1]?.label}</span>
      </div>
    </div>
  )
}
