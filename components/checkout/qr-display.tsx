'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Copy,
  Check,
  Download,
  ShieldCheck,
  Zap,
  AlertCircle,
  RefreshCw,
  Maximize2,
  X,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SepayQrConfig } from '@/modules/checkout'

export interface QrDisplayProps {
  qrUrl: string
  paymentReference: string
  amount: number
  expiresAt: string
  bankConfig?: SepayQrConfig
  className?: string
}

/**
 * QR display — Giao diện thanh toán VietQR cao cấp Kandes.shop.
 * - Hỗ trợ mở to (Lightbox modal) khi bấm vào ảnh QR.
 * - Hiệu ứng loading khi đang tạo / tải mã QR.
 * - Hiển thị 100% đầy đủ nội dung chuyển khoản không bị che/cắt chữ.
 */
export function QrDisplay({
  qrUrl,
  paymentReference,
  amount,
  expiresAt,
  bankConfig,
  className,
}: QrDisplayProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Tự động cuộn mượt xuống phần mã thanh toán QR khi người mua vào trang
    const timer = setTimeout(() => {
      if (qrRef.current) {
        qrRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [])

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomed(false)
    }
    if (isZoomed) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isZoomed])

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2500)
    } catch {
      // ignore
    }
  }

  const formattedAmount = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)

  const rawAmount = String(Math.trunc(amount))

  const bankName = bankConfig?.bankName || 'MB Bank (Quân Đội)'
  const accountNumber = bankConfig?.accountNumber || '7777555552628'
  const accountName = bankConfig?.accountName || 'LE VU HAI'

  const handleDownloadQr = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      const response = await fetch(qrUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `VietQR-Kandes-${paymentReference.replace(/\s+/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      window.open(qrUrl, '_blank')
    }
  }

  return (
    <>
      <div
        ref={qrRef}
        id="payment-section"
        className={cn(
          'border border-electric/40 bg-ink-900/95 rounded-xl p-4 sm:p-5 space-y-4 relative shadow-2xl shadow-electric/10 backdrop-blur-md scroll-mt-6',
          'before:absolute before:inset-0 before:pointer-events-none before:border-t-2 before:border-electric/80',
          className
        )}
      >
        {/* Corner brackets */}
        <span className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-electric" />
        <span className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-electric" />
        <span className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-plasma" />
        <span className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-plasma" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-700/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[13px] font-mono font-bold uppercase tracking-wider text-electric">
              [ THANH TOÁN TỰ ĐỘNG VIETQR ]
            </span>
          </div>
          <span className="px-2.5 py-0.5 bg-electric/15 border border-electric/40 text-electric text-[11px] font-mono uppercase rounded-full flex items-center gap-1 font-semibold">
            <Zap size={11} className="text-electric" /> DUYỆT TỰ ĐỘNG 30S
          </span>
        </div>

        {/* Main Grid: QR + Quick Transfer Info */}
        <div className="grid sm:grid-cols-[220px_1fr] gap-4 items-center">
          {/* QR Box */}
          <div className="flex flex-col items-center gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => !imgError && imgLoaded && setIsZoomed(true)}
              className={cn(
                'group relative p-2.5 bg-white rounded-xl shadow-2xl border-2 border-electric/50 flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-electric hover:shadow-electric/30 hover:scale-[1.02]',
                (!imgLoaded || imgError) && 'cursor-default hover:scale-100'
              )}
            >
              {/* Skeleton / Spinner khi đang tải ảnh QR */}
              {!imgLoaded && !imgError && (
                <div className="w-[190px] h-[190px] rounded-lg bg-ink-950 flex flex-col items-center justify-center text-center p-3 space-y-2.5">
                  <Loader2 size={28} className="text-electric animate-spin" />
                  <div className="space-y-1">
                    <p className="text-[12px] font-mono text-electric font-bold animate-pulse">
                      Đang tạo VietQR...
                    </p>
                    <p className="text-[9px] text-ink-400">Vui lòng chờ trong giây lát</p>
                  </div>
                </div>
              )}

              {!imgError ? (
                <>
                  <img
                    src={qrUrl}
                    alt={`Mã QR chuyển khoản ${paymentReference}`}
                    width={190}
                    height={190}
                    className={cn(
                      'block rounded-lg w-[190px] h-[190px] object-contain transition-opacity duration-300',
                      imgLoaded ? 'opacity-100' : 'opacity-0 absolute'
                    )}
                    loading="eager"
                    onLoad={() => setImgLoaded(true)}
                    onError={() => {
                      setImgError(true)
                      setImgLoaded(true)
                    }}
                  />
                  {/* Zoom Badge on Hover */}
                  {imgLoaded && (
                    <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-[2px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-ink-50">
                      <Maximize2 size={24} className="text-electric animate-bounce" />
                      <span className="text-[11px] font-mono font-bold text-electric uppercase tracking-wider bg-ink-900/90 px-2 py-0.5 rounded border border-electric/40">
                        Bấm để phóng to
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-[190px] h-[190px] flex flex-col items-center justify-center p-3 text-center bg-ink-100 rounded-lg">
                  <AlertCircle size={28} className="text-warning mb-2" />
                  <p className="text-ink-800 text-xs font-semibold">Quét thủ công</p>
                  <p className="text-ink-600 text-[11px]">Chuyển theo thông tin bên phải</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                disabled={!imgLoaded || imgError}
                className="text-[11px] font-mono text-ink-300 hover:text-electric flex items-center gap-1 transition-colors py-1 px-2.5 rounded bg-ink-800 border border-ink-700 hover:border-electric/40 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Maximize2 size={11} /> Phóng to
              </button>
              <button
                type="button"
                onClick={handleDownloadQr}
                className="text-[11px] font-mono text-ink-300 hover:text-electric flex items-center gap-1 transition-colors py-1 px-2.5 rounded bg-ink-800 border border-ink-700 hover:border-electric/40"
              >
                <Download size={11} /> Tải ảnh QR
              </button>
            </div>
          </div>

          {/* Transfer Info Quick Cards */}
          <div className="space-y-2.5 min-w-0">
            {/* Payment Reference Highlight - FULL WIDTH NO TRUNCATION */}
            <div className="p-3 bg-electric/15 border-2 border-electric/50 rounded-xl space-y-1.5 shadow-lg shadow-electric/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-electric flex items-center gap-1">
                  ⚡ NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)
                </span>
                <span className="text-[9px] font-mono text-ink-300">Click để sao chép</span>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => copyToClipboard(paymentReference, 'ref')}
                className="group flex items-center justify-between gap-2 p-2 bg-ink-950/95 hover:bg-ink-950 border border-electric/40 hover:border-electric rounded-lg cursor-pointer transition-all"
                title="Bấm vào để sao chép mã"
              >
                <code className="font-mono text-electric font-extrabold text-[15px] sm:text-[16px] tracking-wider select-all break-all leading-tight">
                  {paymentReference}
                </code>
                <Button
                  type="button"
                  size="sm"
                  className={cn(
                    'h-8 px-2.5 font-mono text-xs font-bold transition-all flex-shrink-0',
                    copiedField === 'ref'
                      ? 'bg-emerald-500 text-ink-950 hover:bg-emerald-400 border-none'
                      : 'bg-electric hover:bg-electric-hover text-ink-950 shadow-sm'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(paymentReference, 'ref')
                  }}
                >
                  {copiedField === 'ref' ? (
                    <>
                      <Check size={13} className="mr-1" /> ĐÃ CHÉP
                    </>
                  ) : (
                    <>
                      <Copy size={13} className="mr-1" /> CHÉP
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Amount */}
            <div className="p-2.5 bg-ink-800/90 border border-ink-700/90 rounded-xl flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-ink-300 block">
                  SỐ TIỀN CẦN CHUYỂN
                </span>
                <span className="text-[16px] text-electric font-mono font-extrabold tabular-nums block truncate">
                  {formattedAmount}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-7 px-2 text-[12px] font-mono transition-all flex-shrink-0 border-ink-600 hover:border-electric/50',
                  copiedField === 'amount' && 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                )}
                onClick={() => copyToClipboard(rawAmount, 'amount')}
              >
                {copiedField === 'amount' ? (
                  <>
                    <Check size={11} className="mr-1 text-emerald-400" /> ĐÃ CHÉP
                  </>
                ) : (
                  <>
                    <Copy size={11} className="mr-1" /> CHÉP TIỀN
                  </>
                )}
              </Button>
            </div>

            {/* Account Number */}
            <div className="p-2.5 bg-ink-800/90 border border-ink-700/90 rounded-xl flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-ink-300 block truncate">
                  {bankName} · {accountName}
                </span>
                <span className="text-[14px] text-ink-50 font-mono font-bold tracking-wide block truncate">
                  {accountNumber}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-7 px-2 text-[12px] font-mono transition-all flex-shrink-0 border-ink-600 hover:border-electric/50',
                  copiedField === 'acc' && 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                )}
                onClick={() => copyToClipboard(accountNumber, 'acc')}
              >
                {copiedField === 'acc' ? (
                  <>
                    <Check size={11} className="mr-1 text-emerald-400" /> ĐÃ CHÉP
                  </>
                ) : (
                  <>
                    <Copy size={11} className="mr-1" /> CHÉP SỐ TK
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Auto-Detection Pulse Banner */}
        <div className="p-2.5 bg-ink-950/95 border border-ink-800 rounded-lg flex items-center justify-between text-[12px] text-ink-200">
          <div className="flex items-center gap-2">
            <RefreshCw size={12} className="text-electric animate-spin flex-shrink-0" />
            <span className="truncate">Đang lắng nghe chuyển khoản tự động (kiểm tra mỗi 2s)...</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1 flex-shrink-0 ml-2">
            <ShieldCheck size={12} /> Tự động duyệt
          </span>
        </div>
      </div>

      {/* Lightbox Modal phóng to mã QR */}
      {isZoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Phóng to mã QR thanh toán"
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/85 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm sm:max-w-md bg-ink-900 border-2 border-electric/60 rounded-2xl p-6 shadow-2xl shadow-electric/20 space-y-4 text-center animate-in zoom-in-95 duration-200"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full text-ink-300 hover:text-ink-50 bg-ink-800 hover:bg-ink-700 transition-colors"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>

            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-electric block">
                [ QUÉT MÃ VIETQR QUA APP NGÂN HÀNG ]
              </span>
              <h3 className="text-h3 font-display text-ink-50 font-bold">Mã QR Thanh Toán</h3>
              <p className="text-body-xs text-ink-300">
                Mở ứng dụng ngân hàng hoặc Momo, VNPay để quét thanh toán
              </p>
            </div>

            {/* QR Big Box */}
            <div className="p-3.5 bg-white rounded-xl shadow-2xl border-2 border-electric mx-auto inline-block">
              <img
                src={qrUrl}
                alt={`Mã QR ${paymentReference}`}
                width={280}
                height={280}
                className="block rounded-lg w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] object-contain"
              />
            </div>

            {/* Quick Summary in modal */}
            <div className="p-2.5 bg-ink-950 rounded-lg border border-ink-700/80 flex items-center justify-between text-body-xs font-mono">
              <div className="text-left">
                <span className="text-ink-400 block text-[9px]">SỐ TIỀN:</span>
                <span className="text-electric font-bold text-sm">{formattedAmount}</span>
              </div>
              <div className="text-right">
                <span className="text-ink-400 block text-[9px]">NỘI DUNG:</span>
                <span className="text-electric font-bold text-sm">{paymentReference}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadQr}
                className="font-mono text-xs border-ink-700 hover:border-electric"
              >
                <Download size={13} className="mr-1.5" /> Tải ảnh QR
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsZoomed(false)}
                className="font-mono text-xs bg-electric hover:bg-electric-hover text-ink-950 font-bold"
              >
                Đã quét xong
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
