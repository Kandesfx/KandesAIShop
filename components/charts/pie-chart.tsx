'use client'

import * as React from 'react'

export interface PieChartData {
  label: string
  value: number
  color?: string
}

interface PieChartProps {
  data: PieChartData[]
  size?: number
  innerRadius?: number
  formatValue?: (value: number) => string
  formatPercent?: (value: number) => string
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
}

export function PieChart({
  data,
  size = 200,
  innerRadius = 0,
  formatValue = (v) => v.toLocaleString(),
  formatPercent = (v) => `${Math.round(v * 100)}%`,
}: PieChartProps) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ width: size, height: size }}>
        Không có dữ liệu
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)
  const cx = size / 2
  const cy = size / 2
  const outerRadius = (size / 2) - 10
  const radius = innerRadius > 0 ? innerRadius : outerRadius

  let currentAngle = 0
  const slices = data.map((d, i) => {
    const angle = total > 0 ? (d.value / total) * 360 : 0
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    return {
      ...d,
      color: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      startAngle,
      endAngle,
      percent: total > 0 ? d.value / total : 0,
      path: angle > 0 ? describeArc(cx, cy, radius, startAngle, endAngle - 0.5) : '',
    }
  })

  return (
    <div className="flex items-center gap-4">
      {/* Pie */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice, i) => (
          <g key={i}>
            <path
              d={slice.path}
              fill={slice.color}
              className="transition-all duration-200 hover:opacity-80"
            >
              <title>
                {slice.label}: {formatValue(slice.value)} ({formatPercent(slice.percent)})
              </title>
            </path>
          </g>
        ))}
        {/* Center hole for donut chart */}
        {innerRadius > 0 && (
          <circle cx={cx} cy={cy} r={innerRadius} fill="white" />
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div
              className="h-3 w-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-gray-700 truncate max-w-[120px]">{slice.label}</span>
            <span className="text-gray-500 text-xs ml-auto pl-2">
              {formatPercent(slice.percent)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
