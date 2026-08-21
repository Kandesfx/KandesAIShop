'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ArrowRight, X, Sparkles, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PaymentSuccessModalProps {
  isOpen: boolean
  orderNumber: string
  onPaidHref?: string
  onClose?: () => void
}

/**
 * Modal Popup Cứng Thanh Toán Thành Công
 * - Hiển thị ngay tại trang QR thanh toán khi hệ thống nhận được tiền.
 * - Có animation tích xanh ăn mừng sinh động và các nút điều hướng rõ ràng.
 */
export function PaymentSuccessModal({
  isOpen,
  orderNumber,
  onPaidHref,
  onClose,
}: PaymentSuccessModalProps) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)
  const [autoRedirect, setAutoRedirect] = useState(true)

  const targetHref = onPaidHref ?? `/order/${orderNumber}/success`

  useEffect(() => {
    if (!isOpen || !autoRedirect) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          if (typeof window !== 'undefined') {
            window.location.href = targetHref
          } else {
            router.push(targetHref)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, autoRedirect, targetHref, router])

  if (!isOpen) return null

  const handleProceed = () => {
    if (typeof window !== 'undefined') {
      window.location.href = targetHref
    } else {
      router.push(targetHref)
    }
  }

  const handleClose = () => {
    setAutoRedirect(false)
    if (onClose) {
      onClose()
    } else {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-success-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-950/90 backdrop-blur-lg animate-in fade-in duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-ink-900 border-2 border-emerald-500/60 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-emerald-500/25 text-center space-y-5 animate-in zoom-in-95 duration-300 overflow-hidden"
      >
        {/* Glow backdrop decorative */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-electric/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-ink-400 hover:text-ink-50 bg-ink-800/80 hover:bg-ink-700 transition-colors z-10"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Animated Green Checkmark Badge */}
        <div className="relative flex items-center justify-center pt-2">
          <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28">
            {/* Ping effect */}
            <div className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping duration-1000" />
            <div className="absolute inset-2 rounded-full bg-emerald-500/30 animate-pulse duration-700" />

            {/* Glowing Emerald Checkmark Circle */}
            <div className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/50 transform transition-transform animate-in zoom-in duration-500">
              <svg
                className="w-11 h-11 sm:w-13 sm:h-13 text-ink-950 drop-shadow-sm"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Title & Headline */}
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 rounded-full text-emerald-400 text-[12px] font-mono font-bold uppercase tracking-widest">
            <Sparkles size={12} className="text-emerald-400 animate-spin" />
            THANH TOÁN THÀNH CÔNG
          </div>
          <h2
            id="payment-success-title"
            className="text-h2 sm:text-h1 font-display text-ink-50 font-extrabold tracking-tight"
          >
            Đã Nhận Được Tiền!
          </h2>
          <p className="text-body-xs sm:text-body-sm text-ink-200 leading-relaxed max-w-sm mx-auto">
            Hệ thống Kandes đã xác thực giao dịch chuyển khoản cho đơn hàng{' '}
            <span className="font-mono text-emerald-400 font-bold bg-ink-950 px-2 py-0.5 rounded border border-emerald-500/30 inline-block">
              {orderNumber}
            </span>
          </p>
        </div>

        {/* Security & Processing Guarantee Cards */}
        <div className="p-3.5 bg-ink-950/90 border border-emerald-500/30 rounded-xl text-left space-y-2 text-body-xs relative z-10 shadow-inner">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
            <span>Giao dịch an toàn & Đang xử lý bàn giao</span>
          </div>
          <p className="text-ink-300 text-[12px] leading-relaxed">
            Mã bản quyền / Key đang được tự động cấp và gửi đến email của bạn. Quý khách có thể xem chi tiết đơn hàng ngay bây giờ.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1 relative z-10">
          <Button
            type="button"
            size="lg"
            onClick={handleProceed}
            className="w-full h-12 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-ink-950 font-display font-extrabold text-sm sm:text-base tracking-wide rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 group"
          >
            <span>XEM ĐƠN HÀNG & NHẬN KEY</span>
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Button>

          {autoRedirect && (
            <p className="text-[12px] font-mono text-ink-400">
              Tự động chuyển tiếp sau{' '}
              <span className="text-emerald-400 font-bold tabular-nums">
                {countdown}s
              </span>{' '}
              ·{' '}
              <button
                type="button"
                onClick={() => setAutoRedirect(false)}
                className="text-ink-300 hover:text-electric underline"
              >
                Dừng chuyển tiếp
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
