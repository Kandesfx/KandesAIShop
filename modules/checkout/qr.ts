import { env } from '../../lib/env'

/**
 * QR builder — Phase 2 P2-07.
 *
 * Dùng VietQR image API (miễn phí, không cần SEPAY_API_TOKEN):
 *   https://img.vietqr.io/image/{bank}-{account}-{template}.png
 *     ?amount={vnd}
 *     &addInfo={paymentReference}
 *     &accountName={accountName}
 *
 * Reference: docs/api/PAYMENT_WEBHOOKS.md §1.2 (Phương án A).
 *
 * paymentReference format chuẩn: "KDS 0042" (4 chữ số sequence trong ngày).
 * Khi SePay webhook (Phase 3) nhận content, regex /KDS\s*(\d{4})/i sẽ match.
 *
 * Tham khảo template codes:
 *   compact  — QR kèm logo ngân hàng, brand VietQR
 *   compact2 — QR có logo + brand ngân hàng
 *   qr_only  — QR thuần, không logo
 */

export type SepayQrConfig = {
  bankCode: string
  accountNumber: string
  accountName: string
  template: 'compact' | 'compact2' | 'qr_only'
}

/**
 * Trả true khi đã cấu hình đủ thông tin để build QR.
 */
export function isSepayConfigured(): boolean {
  return true
}

export function readConfig(): SepayQrConfig {
  const bankCode = env.SEPAY_BANK_CODE || process.env.SEPAY_BANK_CODE || 'MBB'
  const accountNumber = env.SEPAY_ACCOUNT_NUMBER || process.env.SEPAY_ACCOUNT_NUMBER || '0345765692'
  const accountName = env.SEPAY_ACCOUNT_NAME || process.env.SEPAY_ACCOUNT_NAME || 'LE VU HAI'
  const template = (env.SEPAY_QR_TEMPLATE || process.env.SEPAY_QR_TEMPLATE || 'compact2') as SepayQrConfig['template']

  return {
    bankCode,
    accountNumber,
    accountName,
    template,
  }
}

/**
 * Build URL QR image từ VietQR.
 * amount là số nguyên VND (VND không có cents thật, giữ integer để QR encode ổn).
 */
export function buildQrUrl(input: {
  amountVnd: number
  paymentReference: string
  config?: SepayQrConfig
}): string {
  const cfg = input.config ?? readConfig()
  const params = new URLSearchParams({
    amount: String(Math.trunc(input.amountVnd)),
    addInfo: input.paymentReference,
    accountName: cfg.accountName,
  })
  return `https://img.vietqr.io/image/${cfg.bankCode}-${cfg.accountNumber}-${cfg.template}.png?${params.toString()}`
}

/**
 * Payload chuẩn EMV Co-QR (VietQR-compatible) — Phase 3 sẽ dùng để generate
 * QR dynamic từ SePay API. Hiện tại chỉ trả string mô tả để log/debug.
 */
export function describeQrPayload(input: {
  amountVnd: number
  paymentReference: string
  config?: SepayQrConfig
}): string {
  const cfg = input.config ?? readConfig()
  // Phase 2 không tự build EMV QR — Phase 3 sẽ gọi SePay API.
  return `VietQR ${cfg.bankCode} ${cfg.accountNumber} amount=${input.amountVnd} ref=${input.paymentReference}`
}
