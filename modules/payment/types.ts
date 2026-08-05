/**
 * SePay webhook types — Phase 3 P3-01.
 *
 * Dựa trên docs công khai của SePay (https://docs.sepay.vn).
 * Webhook payload fields:
 *   - id:               number — SePay transaction id (idempotency key).
 *   - gateway:          string — bank gateway (vd "Vietcombank", "Techcombank").
 *   - transactionDate:  string — ISO 8601 timestamp.
 *   - accountNumber:    string — TK nhận (đã strip).
 *   - transferAmount:   number — số tiền (VND).
 *   - content:          string — nội dung CK (vd "KDS 0001 thanh toan").
 *   - referenceCode:    string — mã tham chiếu ngân hàng (tuỳ chọn).
 *   - accumulated:      number — số dư sau giao dịch (tuỳ chọn).
 *   - subAccount:       string — sub-account (tuỳ chọn).
 *   - description:      string — mô tả (tuỳ chọn).
 *
 * ⚠️ KHÔNG BAO GIỜ log raw payload — chứa PII (SĐT, tên).
 */

export type SepayWebhookPayload = {
  id: number
  gateway: string
  transactionDate: string
  accountNumber: string
  code?: string | null
  content: string
  transferAmount: number
  accumulated?: number | null
  subAccount?: string | null
  referenceCode?: string | null
  description?: string | null
}

export type RecordPaymentInput = {
  providerTransactionId: string // SePay `id` as string
  orderNumber: string // match từ `content` (regex KDS \d{4})
  amountCents: bigint // SePay `transferAmount * 100` (VND → cents, identity in VND)
  transactionDate: Date
  rawPayload: unknown // Prisma Json
}

export type RecordPaymentResult =
  | {
      kind: 'processed'
      orderId: string
      paymentId: string
      orderStatus: 'paid'
    }
  | {
      kind: 'partial'
      orderId: string
      paymentId: string
      paidSoFar: bigint
      orderTotal: bigint
    }
  | {
      kind: 'duplicate' // đã xử lý transaction này rồi
      paymentId: string
    }
  | {
      kind: 'no_match' // không tìm thấy order nào match paymentReference
      orderNumber: string
    }