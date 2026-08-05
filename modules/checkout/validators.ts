import { z } from 'zod'

/**
 * Validators cho checkout module.
 *
 * Theo MASTER_SPEC §4.5: validate tại route boundary, service trust input.
 *
 * BR-1.7: đơn có ít nhất 1 sản phẩm + tổng tiền > 0 (validate ở service, vì cart
 * có thể trống nếu guest đến trực tiếp).
 */

/** RFC-lite cho VN phone: 10-11 chữ số, optional leading 0 hoặc +84. */
const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Số điện thoại tối thiểu 10 chữ số')
  .max(15, 'Số điện thoại tối đa 15 chữ số')
  .regex(/^[+0-9\s]+$/, 'Số điện thoại chỉ chứa chữ số, khoảng trắng hoặc dấu +')

export const checkoutSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ').max(254),
  phone: phoneSchema,
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional().or(z.literal('')),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Bạn phải đồng ý điều khoản để tiếp tục' }),
  }),
  paymentMethod: z.enum(['sepay_qr']).default('sepay_qr'),
})
export type CheckoutInput = z.infer<typeof checkoutSchema>

export const orderNumberParamSchema = z.object({
  orderNumber: z.string().regex(/^KDS-\d{8}-\d{4}$/, 'Mã đơn không hợp lệ'),
})

/**
 * Schema cho POST /api/orders/track (P2-08 Guest Tracking).
 * - orderNumber: cùng regex với orderNumberParamSchema.
 * - contact: email hoặc SĐT (Bắt buộc 1 trong 2). Max 254 chars để chống abuse.
 *
 * Service sẽ check: orderNumber tồn tại + (guestEmail === contact normalized
 * OR guestPhone === contact normalized).
 *
 * Lưu ý: chống enumerate bằng rate-limit + constant-time response (không
 * phân biệt "không tồn tại" vs "sai contact" — cùng trả 404 + delay ~200ms).
 */
export const trackOrderSchema = z.object({
  orderNumber: z.string().regex(/^KDS-\d{8}-\d{4}$/, 'Mã đơn không hợp lệ'),
  contact: z.string().trim().min(3).max(254),
})
export type TrackOrderInput = z.infer<typeof trackOrderSchema>

// ====== P2-09 My Orders (User) ======

/** Status filter cho list đơn của user. `all` = không filter. */
export const orderStatusFilter = z.enum([
  'all',
  'pending',
  'paid',
  'processing',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
])
export type OrderStatusFilter = z.infer<typeof orderStatusFilter>

/**
 * GET /api/orders/me?status=...&page=1&limit=20
 * - status: enum (default 'all').
 * - page: 1-based, max 200.
 * - limit: 1..50, default 20.
 */
export const ordersQuerySchema = z.object({
  status: orderStatusFilter.default('all'),
  page: z.coerce.number().int().min(1).max(200).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type OrdersQueryInput = z.infer<typeof ordersQuerySchema>

/**
 * POST /api/orders/:id/reveal-key
 * - password: bắt buộc (D16) — chống người nhà/shared device nhặt được.
 *   Spec REST_API §4 ghi "OTP" nhưng P2-09 chọn password để không phụ thuộc
 *   email/SMS latency + đơn giản UX. Phase 3 có thể thêm OTP option.
 */
export const revealKeySchema = z.object({
  password: z.string().min(1, 'Nhập mật khẩu').max(200),
})
export type RevealKeyInput = z.infer<typeof revealKeySchema>
