'use client'

import { Copy, Check } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface QrDisplayProps {
  qrUrl: string
  paymentReference: string
  amount: number
  expiresAt: string
  className?: string
}

/**
 * QR display — image từ VietQR + paymentReference copy-to-clipboard + amount.
 *
 * Phase 2: dùng img.vietqr.io (static, không động). Phase 3 sẽ thay bằng QR
 * dynamic từ SePay API (EMV Co-QR).
 */
export function QrDisplay({
  qrUrl,
  paymentReference,
  amount,
  expiresAt,
  className,
}: QrDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentReference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Bỏ qua — clipboard API có thể fail trên HTTP / insecure context
    }
  }

  const formattedAmount = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)

  return (
    <div
      className={cn(
        'border border-ink-700 bg-ink-900 p-6 space-y-4 relative',
        'before:absolute before:inset-0 before:pointer-events-none',
        'before:border-t-2 before:border-electric/60',
        className
      )}
    >
      {/* Corner brackets — brand style */}
      <span className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-electric" />
      <span className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-electric" />
      <span className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-plasma" />
      <span className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-plasma" />

      <div className="text-center">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ THANH TOÁN QR ]
        </span>
      </div>

      <div className="flex justify-center bg-ink-50 p-4 mx-auto w-fit">
        <Image
          src={qrUrl}
          alt={`QR thanh toán ${paymentReference}`}
          width={240}
          height={240}
          className="block"
          unoptimized
          priority
        />
      </div>

      <div className="space-y-3 text-body-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-300 text-[10px] font-mono uppercase tracking-[0.18em]">
            SỐ TIỀN
          </span>
          <span className="text-h4 text-electric font-bold tabular-nums">{formattedAmount}</span>
        </div>

        <div className="space-y-1">
          <span className="text-ink-300 text-[10px] font-mono uppercase tracking-[0.18em] block">
            NỘI DUNG CHUYỂN KHOẢN
          </span>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-ink-800 border border-ink-700 font-mono text-ink-50 text-body-sm break-all">
              {paymentReference}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              leftIcon={copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              aria-label="Sao chép nội dung"
            >
              {copied ? 'ĐÃ COPY' : 'COPY'}
            </Button>
          </div>
        </div>

        <p className="text-body-xs text-ink-300 pt-2 border-t border-ink-700">
          Quét QR bằng app ngân hàng hoặc copy nội dung CK. Đơn tự động xác thực khi nhận được thanh
          toán đúng số tiền và nội dung trước{' '}
          <time dateTime={expiresAt} className="text-ink-100 font-mono">
            {new Date(expiresAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          .
        </p>
      </div>
    </div>
  )
}
