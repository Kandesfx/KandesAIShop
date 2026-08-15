'use client'

import * as React from 'react'

export interface ChartDataPoint {
  date: string
  value: number
}

interface LineChartProps {
  data: ChartDataPoint[]
  width?: number
  height?: number
  color?: string
  showDots?: boolean
  showGrid?: boolean
  formatValue?: (value: number) => string
  formatDate?: (date: string) => string
}

export function LineChart({
  data,
  width = 600,
  height = 200,
  color = '#3b82f6',
  showDots = true,
  showGrid = true,
  formatValue = (v) => v.toLocaleString(),
  formatDate = (d) => d,
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ width, height }}>
        Không có dữ liệu
      </div>
    )
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const minValue = Math.min(...data.map((d) => d.value), 0)
  const valueRange = maxValue - minValue || 1

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight,
    data: d,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const lastPoint = points[points.length - 1]
  const areaD = lastPoint
    ? `${pathD} L ${lastPoint.x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`
    : ''

  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    minValue + (valueRange / yTicks) * i
  )

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Grid lines */}
      {showGrid &&
        yTickValues.map((tick, i) => {
          const y = padding.top + chartHeight - ((tick - minValue) / valueRange) * chartHeight
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-500 text-[10px]"
              >
                {formatValue(Math.round(tick))}
              </text>
            </g>
          )
        })}

      {/* Y-axis label */}
      <text
        x={12}
        y={padding.top + chartHeight / 2}
        textAnchor="middle"
        className="fill-gray-400 text-[10px]"
        transform={`rotate(-90, 12, ${padding.top + chartHeight / 2})`}
      >
        Tokens
      </text>

      {/* Area fill */}
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGradient)" />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {showDots &&
        points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="white"
              stroke={color}
              strokeWidth={2}
              className="transition-all duration-200 hover:r-6"
            />
            <title>
              {formatDate(p.data.date)}: {formatValue(p.data.value)} tokens
            </title>
          </g>
        ))}

      {/* X-axis labels */}
      {points
        .filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0)
        .map((p, i, arr) => (
          <text
            key={i}
            x={p.x}
            y={height - 10}
            textAnchor="middle"
            className="fill-gray-500 text-[10px]"
          >
            {formatDate(p.data.date)}
          </text>
        ))}
    </svg>
  )
}
