'use client'

import Link from 'next/link'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface Alert {
  type: 'warning' | 'error' | 'info'
  message: string
  href?: string
}

interface DashboardAlertsProps {
  alerts: Alert[]
}

const icons = {
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

const colors = {
  warning: 'border-warning/50 bg-warning/10 text-warning',
  error: 'border-danger/50 bg-danger/10 text-danger',
  info: 'border-electric/50 bg-electric/10 text-electric',
}

export function DashboardAlerts({ alerts }: DashboardAlertsProps) {
  return (
    <div className="space-y-2">
      {alerts.map((alert, idx) => {
        const Icon = icons[alert.type]
        const colorClass = colors[alert.type]

        const content = (
          <div className={`flex items-center gap-3 p-3 border rounded ${colorClass}`}>
            <Icon size={16} strokeWidth={1.5} aria-hidden />
            <span className="flex-1 text-[12px]">{alert.message}</span>
            {alert.href && (
              <span className="text-[10px] opacity-60">Xem →</span>
            )}
          </div>
        )

        if (alert.href) {
          return (
            <Link key={idx} href={alert.href} className="block hover:opacity-90">
              {content}
            </Link>
          )
        }

        return <div key={idx}>{content}</div>
      })}
    </div>
  )
}
