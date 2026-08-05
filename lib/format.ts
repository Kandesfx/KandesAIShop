/**
 * Format helpers — UI-facing.
 *
 * Đơn vị tiền: trong DB lưu `priceCents` (BigInt) với 1 đơn vị = 1 VND (VND không
 * có cents thực sự, dùng integer cho đơn giản). Tên field giữ `priceCents` để
 * tương thích schema.
 *
 * Helpers:
 *   - formatVND(value): BigInt/number → VND string
 *   - formatVnd(value): alias cho formatVND (cho code cũ)
 *   - vndToCents / centsToVnd: deprecated — vẫn là identity
 */

const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const NUMBER_FORMATTER = new Intl.NumberFormat('vi-VN')

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Format BigInt/number → VND string.
 * Input: 240000 (VND) → "240.000 ₫"
 */
export function formatVND(cents: bigint | number | string | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  const num = typeof cents === 'bigint' ? Number(cents) : Number(cents)
  if (!Number.isFinite(num)) return '—'
  return VND_FORMATTER.format(num)
}

/** Alias để tương thích code cũ. */
export const formatVnd = formatVND

/** Format number mặc định (không có currency). */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return NUMBER_FORMATTER.format(num)
}

/** Format Date → dd/mm/yyyy HH:mm. */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return DATE_FORMATTER.format(date)
}

/** Slugify tên sản phẩm/danh mục → URL-safe slug. */
export function slugify(input: string): string {
  if (!input) return ''
  return input
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Mask value nhạy cảm (key, OTP) — chỉ hiển thị 4 ký tự đầu + ***. */
export function maskSecret(value: string | null | undefined, visible = 4): string {
  if (!value) return ''
  if (value.length <= visible) return '***'
  return value.slice(0, visible) + '***'
}

// === Display labels (UI) ===

export const DELIVERY_LABELS: Record<string, string> = {
  INSTANT_AUTO: 'Giao tự động',
  MANUAL_KEY: 'Key thủ công',
  MANUAL_MESSAGE: 'Tin nhắn thủ công',
  FILE_DOWNLOAD: 'Tải file',
  TOPUP: 'Nạp credit',
  EXTERNAL_INVITE: 'Mời ngoài',
}

export const STOCK_LABELS: Record<string, string> = {
  in_stock: 'Còn hàng',
  out_of_stock: 'Hết hàng',
  preorder: 'Đặt trước',
}

export const DELIVERY_BADGE_CLASS: Record<string, string> = {
  INSTANT_AUTO: 'badge-electric',
  MANUAL_KEY: 'badge-plasma',
  MANUAL_MESSAGE: 'badge-warning',
  FILE_DOWNLOAD: 'badge-neutral',
  TOPUP: 'badge-neutral',
  EXTERNAL_INVITE: 'badge-neutral',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  created: 'Mới tạo',
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  processing: 'Đang xử lý',
  delivered: 'Đã giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã huỷ',
  refunded: 'Đã hoàn tiền',
}

export const ORDER_STATUS_BADGE_CLASS: Record<string, string> = {
  created: 'badge-neutral',
  pending: 'badge-warning',
  paid: 'badge-electric',
  processing: 'badge-plasma',
  delivered: 'badge-electric',
  completed: 'badge-electric',
  cancelled: 'badge-neutral',
  refunded: 'badge-neutral',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Chưa TT',
  awaiting: 'Chờ xác nhận',
  paid: 'Đã TT',
  partial: 'TT 1 phần',
  refunded: 'Đã hoàn',
  failed: 'Lỗi TT',
}

export const PAYMENT_STATUS_BADGE_CLASS: Record<string, string> = {
  unpaid: 'badge-warning',
  awaiting: 'badge-warning',
  paid: 'badge-electric',
  partial: 'badge-plasma',
  refunded: 'badge-neutral',
  failed: 'badge-neutral',
}

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ giao',
  in_progress: 'Đang giao',
  delivered: 'Đã giao',
  failed: 'Giao lỗi',
  partial: 'Giao 1 phần',
}
