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
  bankName?: string
  accountNumber: string
  accountName: string
  template: 'compact' | 'compact2' | 'qr_only'
}

const BANK_NAMES: Record<string, string> = {
  MB: 'MB Bank (Quân Đội)',
  VCB: 'Vietcombank',
  TCB: 'Techcombank',
  ACB: 'ACB',
  VPB: 'VPBank',
  TPB: 'TPBank',
  BIDV: 'BIDV',
  STB: 'Sacombank',
  VIB: 'VIB',
  SHB: 'SHB',
  HDB: 'HDBank',
  OCB: 'OCB',
  MSB: 'MSB',
}

const BANK_SLUGS: Record<string, string> = {
  mbb: 'MB',
  mb: 'MB',
  mbbank: 'MB',
  vcb: 'VCB',
  vietcombank: 'VCB',
  tcb: 'TCB',
  techcombank: 'TCB',
  acb: 'ACB',
  vpb: 'VPB',
  vpbank: 'VPB',
  tpb: 'TPB',
  tpbank: 'TPB',
  bidv: 'BIDV',
  stb: 'STB',
  sacombank: 'STB',
}

export function normalizeBankCode(code: string): string {
  const clean = (code || '').trim().toLowerCase()
  return BANK_SLUGS[clean] || code.toUpperCase()
}

export function getBankName(code: string): string {
  const normalized = normalizeBankCode(code)
  return BANK_NAMES[normalized] || normalized
}

/**
 * Trả true khi đã cấu hình đủ env để build QR.
 * Khi false, route /api/checkout sẽ trả 503 thay vì tạo order (BR-1.7 tránh
 * đơn không có cách thanh toán).
 */
export function isSepayConfigured(): boolean {
  return Boolean(env.SEPAY_BANK_CODE && env.SEPAY_ACCOUNT_NUMBER && env.SEPAY_ACCOUNT_NAME)
}

export function readConfig(): SepayQrConfig {
  if (!isSepayConfigured()) {
    throw new Error(
      'SePay chưa được cấu hình. Set SEPAY_BANK_CODE, SEPAY_ACCOUNT_NUMBER, SEPAY_ACCOUNT_NAME trong .env'
    )
  }
  const bankCode = normalizeBankCode(env.SEPAY_BANK_CODE!)
  return {
    bankCode,
    bankName: getBankName(bankCode),
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
  const normalizedBank = normalizeBankCode(cfg.bankCode)
  const params = new URLSearchParams({
    amount: String(Math.trunc(input.amountVnd)),
    addInfo: input.paymentReference,
    accountName: cfg.accountName,
  })
  return `https://img.vietqr.io/image/${normalizedBank}-${cfg.accountNumber}-${cfg.template}.png?${params.toString()}`
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
  return `VietQR ${cfg.bankCode} ${cfg.accountNumber} amount=${input.amountVnd} ref=${input.paymentReference}`
}
