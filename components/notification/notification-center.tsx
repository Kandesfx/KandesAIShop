'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, CheckCircle2, Key, Clock, ShieldAlert, Sparkles, X } from 'lucide-react'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'order_delivered' | 'order_paid' | 'system' | 'promo'
  createdAt: string
  read: boolean
  link?: string
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1',
    title: 'Hệ thống Giao Key Tự động 30s',
    message: 'Kandes.shop hỗ trợ giao License Key chính hãng trực tiếp qua Email & Web trong 30 giây.',
    type: 'system',
    createdAt: 'Vừa xong',
    read: false,
  },
  {
    id: 'n-2',
    title: 'Hỗ trợ kỹ thuật 24/7',
    message: 'Cần hỗ trợ kích hoạt bản quyền? Liên hệ Zalo Admin 0865.834.117 hoặc tham gia nhóm hỗ trợ.',
    type: 'system',
    createdAt: 'Hôm nay',
    read: false,
    link: 'https://zalo.me/0865834117',
  },
]

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_NOTIFICATIONS)
  const [popupToast, setPopupToast] = useState<AppNotification | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show a quick transient toast popup at bottom corner when page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setPopupToast({
        id: 'toast-live',
        title: 'Kandes AI Marketplace',
        message: 'Bản quyền AI Coding chính hãng — Giao key tự động trong 30s!',
        type: 'system',
        createdAt: 'Vừa xong',
        read: true,
      })
    }, 1200)

    const hideTimer = setTimeout(() => {
      setPopupToast(null)
    }, 6500)

    return () => {
      clearTimeout(timer)
      clearTimeout(hideTimer)
    }
  }, [])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'order_delivered':
        return <Key className="h-4 w-4 text-emerald-400" />
      case 'order_paid':
        return <CheckCircle2 className="h-4 w-4 text-cyan-400" />
      case 'promo':
        return <Sparkles className="h-4 w-4 text-amber-400" />
      default:
        return <Bell className="h-4 w-4 text-electric" />
    }
  }

  return (
    <>
      {/* Transient Quick Popup Toast at bottom-right of viewport (Portal to body) */}
      {mounted &&
        popupToast &&
        createPortal(
          <aside
            aria-label="Thông báo hệ thống"
            className="fixed bottom-6 right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] rounded-xl border border-cyan-500/40 bg-ink-900/95 p-4 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink-50 font-display">
                    {popupToast.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPopupToast(null)}
                    className="text-ink-300 hover:text-ink-50 p-0.5 rounded transition-colors"
                    aria-label="Đóng thông báo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-ink-200 leading-relaxed">
                  {popupToast.message}
                </p>
              </div>
            </div>
          </aside>,
          document.body
        )}

      {/* Notification Bell Button in Header */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(!open)
            if (!open) markAllRead()
          }}
          className="relative p-2 text-ink-100 hover:text-electric transition-colors"
          aria-label="Thông báo"
          title="Trung tâm thông báo"
        >
          <Bell size={18} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sunset px-1 text-[9px] font-mono font-bold text-ink-900 shadow-sm animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-ink-400 bg-ink-900/95 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between border-b border-ink-400/80 px-4 py-3 bg-ink-800/80">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-electric" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-50">
                  Thông Báo & Sự Kiện
                </span>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-mono text-electric hover:underline"
                >
                  Đã đọc tất cả
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-ink-700/50">
              {notifications.map((n) => {
                const ContentWrapper = n.link ? 'a' : 'div'
                const wrapperProps = n.link
                  ? {
                      href: n.link,
                      target: n.link.startsWith('http') ? '_blank' : undefined,
                      rel: n.link.startsWith('http') ? 'noopener noreferrer' : undefined,
                    }
                  : {}

                return (
                  <ContentWrapper
                    key={n.id}
                    {...(wrapperProps as any)}
                    className="flex items-start gap-3 p-3.5 hover:bg-ink-800/60 transition-colors text-left block"
                  >
                    <div className="mt-0.5 shrink-0 p-1.5 rounded bg-ink-800 border border-ink-600">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink-50 font-display">
                          {n.title}
                        </span>
                        <span className="text-[10px] font-mono text-ink-300">
                          {n.createdAt}
                        </span>
                      </div>
                      <p className="text-xs text-ink-200 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </ContentWrapper>
                )
              })}
            </div>

            <div className="border-t border-ink-400/80 p-2.5 bg-ink-800/40 text-center">
              <Link
                href="/account/orders"
                onClick={() => setOpen(false)}
                className="text-[11px] font-mono text-electric hover:underline uppercase tracking-wider"
              >
                Xem lịch sử đơn hàng →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
