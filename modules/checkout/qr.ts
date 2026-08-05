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
 * Trả true khi đã cấu hình đủ env để build QR.
 * Khi false, route /api/checkout sẽ trả 503 thay vì tạo order (BR-1.7 tránh
 * đơn không có cách thanh toán).
 */
export function isSepayConfigured(): boolean {
  return Boolean(env.SEPAY_BANK_CODE && env.SEPAY_ACCOUNT_NUMBER && env.SEPAY_ACCOUNT_NAME)
}

function readConfig(): SepayQrConfig {
  if (!isSepayConfigured()) {
    throw new Error(
      'SePay chưa được cấu hình. Set SEPAY_BANK_CODE, SEPAY_ACCOUNT_NUMBER, SEPAY_ACCOUNT_NAME trong .env'
    )
  }
  return {
    bankCode: env.SEPAY_BANK_CODE!,
    accountNumber: env.SEPAY_ACCOUNT_NUMBER!,
    accountName: env.SEPAY_ACCOUNT_NAME!,
    template: env.SEPAY_QR_TEMPLATE,
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
