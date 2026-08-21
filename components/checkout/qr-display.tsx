'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, Check, Download, ShieldCheck, Zap, AlertCircle, RefreshCw } from 'lucide-react'
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
 * Hỗ trợ quét mã QR tự động + Bảng sao chép chi tiết tài khoản ngân hàng.
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
  const [imgError, setImgError] = useState(false)
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

  const handleDownloadQr = async () => {
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
    <div
      ref={qrRef}
      id="payment-section"
      className={cn(
        'border border-electric/40 bg-ink-900/95 rounded-xl p-5 space-y-4 relative shadow-2xl shadow-electric/10 backdrop-blur-md scroll-mt-6',
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
          <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-electric">
            [ THANH TOÁN TỰ ĐỘNG VIETQR ]
          </span>
        </div>
        <span className="px-2.5 py-0.5 bg-electric/15 border border-electric/40 text-electric text-[10px] font-mono uppercase rounded-full flex items-center gap-1 font-semibold">
          <Zap size={11} className="text-electric" /> DUYỆT TỰ ĐỘNG 30S
        </span>
      </div>

      {/* Main Grid: QR + Quick Transfer Info */}
      <div className="grid sm:grid-cols-[240px_1fr] gap-5 items-center">
        {/* QR Box */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="p-3 bg-white rounded-xl shadow-2xl border-2 border-electric/50 flex items-center justify-center transition-transform hover:scale-[1.02] duration-200">
            {!imgError ? (
              <img
                src={qrUrl}
                alt={`Mã QR chuyển khoản ${paymentReference}`}
                width={220}
                height={220}
                className="block rounded-lg w-[220px] h-[220px] object-contain"
                loading="eager"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-[220px] h-[220px] flex flex-col items-center justify-center p-3 text-center bg-ink-100 rounded-lg">
                <AlertCircle size={28} className="text-warning mb-2" />
                <p className="text-ink-800 text-xs font-semibold">Quét thủ công</p>
                <p className="text-ink-600 text-[10px]">Chuyển theo thông tin bên phải</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleDownloadQr}
            className="text-[11px] font-mono text-ink-300 hover:text-electric flex items-center gap-1.5 transition-colors py-1 px-3 rounded bg-ink-800 border border-ink-700 hover:border-electric/50"
          >
            <Download size={12} /> Tải ảnh QR về máy
          </button>
        </div>

        {/* Transfer Info Quick Cards */}
        <div className="space-y-2 min-w-0">
          {/* Payment Reference Highlight */}
          <div className="p-2.5 bg-electric/10 border border-electric/40 rounded-lg space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-electric flex items-center gap-1">
              ⚡ NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)
            </span>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 px-2.5 py-1.5 bg-ink-950 border border-electric/40 font-mono text-electric font-bold text-[14px] rounded tracking-wider select-all truncate">
                {paymentReference}
              </code>
              <Button
                type="button"
                size="sm"
                className={cn(
                  'h-8 px-2.5 font-mono text-xs font-bold transition-all flex-shrink-0',
                  copiedField === 'ref'
                    ? 'bg-emerald-500 text-ink-950 hover:bg-emerald-400 border-none'
                    : 'bg-electric hover:bg-electric-hover text-ink-950'
                )}
                onClick={() => copyToClipboard(paymentReference, 'ref')}
              >
                {copiedField === 'ref' ? (
                  <>
                    <Check size={12} className="mr-1" /> ĐÃ CHÉP!
                  </>
                ) : (
                  <>
                    <Copy size={12} className="mr-1" /> SAO CHÉP
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Amount */}
          <div className="p-2 bg-ink-800/80 border border-ink-700/80 rounded-lg flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-mono uppercase tracking-wider text-ink-300 block">SỐ TIỀN CẦN CHUYỂN</span>
              <span className="text-[15px] text-electric font-mono font-extrabold tabular-nums block truncate">
                {formattedAmount}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-7 px-2 text-[11px] font-mono transition-all flex-shrink-0',
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
          <div className="p-2 bg-ink-800/80 border border-ink-700/80 rounded-lg flex items-center justify-between gap-2">
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
                'h-7 px-2 text-[11px] font-mono transition-all flex-shrink-0',
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
      <div className="p-2 bg-ink-950/90 border border-ink-800 rounded-lg flex items-center justify-between text-[11px] text-ink-200">
        <div className="flex items-center gap-2">
          <RefreshCw size={12} className="text-electric animate-spin flex-shrink-0" />
          <span className="truncate">Đang đợi tín hiệu chuyển khoản từ ngân hàng...</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1 flex-shrink-0 ml-2">
          <ShieldCheck size={12} /> Tự động duyệt
        </span>
      </div>
    </div>
  )
}
