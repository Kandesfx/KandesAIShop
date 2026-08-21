'use client'

import { useState } from 'react'
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
      className={cn(
        'border border-electric/30 bg-ink-900/95 rounded-lg p-5 sm:p-6 space-y-5 relative shadow-xl shadow-electric/5 backdrop-blur-sm',
        'before:absolute before:inset-0 before:pointer-events-none before:border-t-2 before:border-electric/70',
        className
      )}
    >
      {/* Corner brackets */}
      <span className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-electric" />
      <span className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-electric" />
      <span className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-plasma" />
      <span className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-plasma" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-700/80 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-electric">
            [ THANH TOÁN TỰ ĐỘNG VIETQR ]
          </span>
        </div>
        <span className="px-2 py-0.5 bg-electric/10 border border-electric/30 text-electric text-[10px] font-mono uppercase rounded flex items-center gap-1">
          <Zap size={11} className="text-electric" /> DUYỆT TRONG 30S
        </span>
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col items-center space-y-3">
        <div className="p-3 bg-white rounded-xl shadow-2xl shadow-electric/15 border-2 border-electric/50 transition-transform duration-300 hover:scale-[1.02] flex items-center justify-center min-h-[220px] min-w-[220px] max-w-[260px]">
          {!imgError ? (
            <img
              src={qrUrl}
              alt={`Mã QR chuyển khoản ${paymentReference}`}
              width={230}
              height={230}
              className="block rounded-lg"
              loading="eager"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-[230px] h-[230px] flex flex-col items-center justify-center p-4 text-center bg-ink-100 rounded-lg">
              <AlertCircle size={32} className="text-warning mb-2" />
              <p className="text-ink-800 text-xs font-semibold">Chuyển sang quét thủ công</p>
              <p className="text-ink-600 text-[10px] mt-1">Vui lòng chuyển khoản theo thông tin bên dưới</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="text-[11px] font-mono text-ink-300 hover:text-electric flex items-center gap-1 transition-colors py-1 px-2.5 rounded bg-ink-800/80 border border-ink-700 hover:border-electric/40"
          >
            <Download size={12} /> Tải ảnh QR
          </button>
        </div>

        <p className="text-center text-[11px] text-ink-300 flex items-center justify-center gap-1.5 font-sans">
          <ShieldCheck size={13} className="text-emerald-400 flex-shrink-0" />
          <span>Mở app ngân hàng bất kỳ (MB, VCB, Techcom, TPB, MoMo...) để quét mã</span>
        </p>
      </div>

      {/* Transfer Information List */}
      <div className="space-y-2.5 pt-2 border-t border-ink-700/80 text-body-sm">
        {/* Bank & Account */}
        <div className="p-3 bg-ink-800/90 border border-ink-700 rounded space-y-2">
          <div className="flex items-center justify-between text-body-xs">
            <span className="text-ink-300 font-mono text-[10px] uppercase tracking-wider">NGÂN HÀNG</span>
            <span className="text-ink-50 font-semibold">{bankName}</span>
          </div>

          <div className="flex items-center justify-between text-body-xs pt-1.5 border-t border-ink-700/50">
            <span className="text-ink-300 font-mono text-[10px] uppercase tracking-wider">CHỦ TÀI KHOẢN</span>
            <span className="text-ink-50 font-mono font-semibold uppercase">{accountName}</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-ink-700/50">
            <div>
              <span className="text-ink-300 font-mono text-[10px] uppercase tracking-wider block">SỐ TÀI KHOẢN</span>
              <span className="text-h4 text-ink-50 font-mono font-bold tracking-wide">{accountNumber}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-8 text-xs font-mono transition-all',
                copiedField === 'acc' && 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
              )}
              onClick={() => copyToClipboard(accountNumber, 'acc')}
            >
              {copiedField === 'acc' ? (
                <>
                  <Check size={13} className="mr-1 text-emerald-400" /> ĐÃ CHÉP
                </>
              ) : (
                <>
                  <Copy size={13} className="mr-1" /> CHÉP SỐ TK
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Amount */}
        <div className="p-3 bg-ink-800/90 border border-ink-700 rounded flex items-center justify-between gap-2">
          <div>
            <span className="text-ink-300 font-mono text-[10px] uppercase tracking-wider block">SỐ TIỀN THANH TOÁN</span>
            <span className="text-h3 text-electric font-mono font-extrabold tabular-nums">{formattedAmount}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'h-8 text-xs font-mono transition-all',
              copiedField === 'amount' && 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
            )}
            onClick={() => copyToClipboard(rawAmount, 'amount')}
          >
            {copiedField === 'amount' ? (
              <>
                <Check size={13} className="mr-1 text-emerald-400" /> ĐÃ CHÉP
              </>
            ) : (
              <>
                <Copy size={13} className="mr-1" /> CHÉP TIỀN
              </>
            )}
          </Button>
        </div>

        {/* Payment Reference (Crucial) */}
        <div className="p-3 bg-electric/5 border border-electric/40 rounded space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-electric font-mono text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1">
              ⚡ NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)
            </span>
            <span className="text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
              Chính xác 100%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-ink-950 border border-electric/40 font-mono text-electric font-bold text-body-base rounded tracking-wider select-all break-all">
              {paymentReference}
            </code>
            <Button
              type="button"
              size="sm"
              className={cn(
                'h-9 px-3 font-mono text-xs font-bold transition-all',
                copiedField === 'ref'
                  ? 'bg-emerald-500 text-ink-950 hover:bg-emerald-400 border-none'
                  : 'bg-electric hover:bg-electric-hover text-ink-950'
              )}
              onClick={() => copyToClipboard(paymentReference, 'ref')}
            >
              {copiedField === 'ref' ? (
                <>
                  <Check size={14} className="mr-1" /> ĐÃ CHÉP!
                </>
              ) : (
                <>
                  <Copy size={14} className="mr-1" /> SAO CHÉP
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-ink-300 leading-normal pt-1">
            * Hệ thống tự động kích hoạt mã ngay khi nhận được tiền với nội dung trên.
          </p>
        </div>
      </div>

      {/* Auto-Detection Pulse Banner */}
      <div className="p-2.5 bg-ink-950/80 border border-ink-800 rounded flex items-center justify-between text-[11px] text-ink-200">
        <div className="flex items-center gap-2">
          <RefreshCw size={13} className="text-electric animate-spin" />
          <span>Đang đợi tín hiệu chuyển khoản từ ngân hàng...</span>
        </div>
        <span className="text-[10px] font-mono text-ink-400">Tự động duyệt</span>
      </div>
    </div>
  )
}
