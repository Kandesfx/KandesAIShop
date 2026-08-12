import { z } from 'zod'

/**
 * SePay webhook validator — Phase 3 P3-01.
 *
 * ⚠️ Route boundary. Service trust input.
 *
 * Schema theo docs SePay (id là number, transferAmount là number VND).
 */
export const sepayWebhookSchema = z.object({
  id: z.number().int().positive(),
  gateway: z.string().min(1).max(64),
  transactionDate: z.string().min(1),
  accountNumber: z.string().min(1).max(64),
  code: z.string().nullable().optional(),
  content: z.string().min(1).max(512),
  transferAmount: z.number().int().nonnegative(),
  accumulated: z.number().nullable().optional(),
  subAccount: z.string().nullable().optional(),
  referenceCode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})
export type SepayWebhookInput = z.infer<typeof sepayWebhookSchema>

/** Pattern để tách paymentReference từ content.
 *  Match cả 2 format:
 *    - "KDS-YYYYMMDD-0001" — full orderNumber (có dashes)
 *    - "KDSxxxx" hoặc "KDS xxxx" — short ref (4-8 alphanumeric, optional space)
 *  Capture group 1 = full orderNumber, group 2 = short ref.
 *
 *  Alphanumeric suffix theo mẫu KDS đã tạo: chỉ dùng A-Z (không O) + 2-9 (không 0,1).
 */
export const PAYMENT_REFERENCE_PATTERN =
  /(KDS-\d{8}-\d{4})|(KDS[- ]?[A-Z2-9]{4,8})/i