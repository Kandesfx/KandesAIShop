import type { NotificationEvent, NotificationData, ResolvedTemplate } from './types'

/**
 * Inline HTML templates — Phase 3.
 *
 * We keep templates plain HTML strings (no React) until Phase 5 introduces
 * React Email. Keys are NEVER embedded inside transactional emails; the email
 * points users to the secure /account/orders/[n] page (D16). This keeps the
 * audit trail clean and prevents key leakage via email forwarding.
 */

const BRAND = 'Kandes.shop'

function fmtMoney(cents: string, currency: string): string {
  const n = Number(cents) / 1
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0)
}

function itemRows(items: NotificationData['items']): string {
  return items
    .map(
      (it) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#222;">${escapeHtml(it.name)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#666;text-align:center;">x${it.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#222;text-align:right;">${fmtMoney(it.unitPriceCents, 'VND')}</td>
      </tr>`
    )
    .join('')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function shell(subject: string, body: string): string {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fafafa;margin:0;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;">
      <div style="padding:16px 20px;border-bottom:1px solid #eee;color:#111;font-weight:600;">${BRAND} · ${escapeHtml(subject)}</div>
      <div style="padding:20px;">${body}</div>
      <div style="padding:12px 20px;border-top:1px solid #eee;color:#888;font-size:12px;">
        Email này gửi tự động — vui lòng không reply trực tiếp.
      </div>
    </div>
  </body></html>`
}

function accountHint(orderNumber: string, copy: string): string {
  return `<p style="margin:16px 0 0;font-size:13px;color:#666;">${copy}</p>
    <p style="margin:8px 0 0;">
      <a href="https://kandes.shop/account/orders/${orderNumber}"
         style="display:inline-block;padding:8px 14px;border:1px solid #111;color:#111;text-decoration:none;font-size:13px;">
        Mở đơn hàng
      </a>
    </p>`
}

export function resolveTemplate(
  event: NotificationEvent,
  data: NotificationData
): ResolvedTemplate | null {
  const total = fmtMoney(data.totalCents, data.currency)
  switch (event) {
    case 'order.created': {
      const subject = `[${BRAND}] Đơn hàng ${data.orderNumber} đã được tạo`
      const html = shell(
        'Đơn hàng đã tạo',
        `<p style="margin:0 0 12px;color:#222;">Cảm ơn bạn đã đặt hàng. Tổng: <strong>${total}</strong>.</p>
         <table style="width:100%;border-collapse:collapse;font-size:13px;">${itemRows(data.items)}</table>
         ${accountHint(data.orderNumber, 'Theo dõi trạng thái trong trang đơn hàng.')}`
      )
      const text = `Đơn hàng ${data.orderNumber} đã tạo. Tổng: ${total}. Mở: https://kandes.shop/account/orders/${data.orderNumber}`
      return { subject, html, text }
    }
    case 'order.paid': {
      const subject = `[${BRAND}] Đã nhận thanh toán · ${data.orderNumber}`
      const html = shell(
        'Đã thanh toán',
        `<p style="margin:0 0 12px;color:#222;">Kandes đã nhận thanh toán <strong>${total}</strong> cho đơn <strong>${data.orderNumber}</strong>.</p>
         <p style="margin:0;color:#666;font-size:13px;">Đơn đang được xử lý — sản phẩm sẽ được giao trong ít phút tới.</p>
         ${accountHint(data.orderNumber, 'Xem chi tiết đơn hàng.')}`
      )
      const text = `Thanh toán ${total} cho đơn ${data.orderNumber} đã được xác nhận. Mở: https://kandes.shop/account/orders/${data.orderNumber}`
      return { subject, html, text }
    }
    case 'order.delivered': {
      const subject = `[${BRAND}] Đã giao đơn ${data.orderNumber}`
      const body =
        data.deliveredContentKeys === false
          ? `<p style="margin:0 0 12px;color:#222;">Đơn <strong>${data.orderNumber}</strong> đã được admin xử lý. Vui lòng mở trang đơn hàng để nhận nội dung giao.</p>`
          : `<p style="margin:0 0 12px;color:#222;">Đơn <strong>${data.orderNumber}</strong> đã được giao. Sản phẩm kỹ thuật số đã có sẵn trong tài khoản của bạn.</p>`
      const html = shell(
        'Đã giao hàng',
        `${body}
         <table style="width:100%;border-collapse:collapse;font-size:13px;">${itemRows(data.items)}</table>
         ${accountHint(
           data.orderNumber,
           'Mở đơn hàng để xem key / nội dung đã giao. Không chia sẻ key với người khác.'
         )}`
      )
      const text = `Đơn ${data.orderNumber} đã được giao. Mở: https://kandes.shop/account/orders/${data.orderNumber}`
      return { subject, html, text }
    }
    case 'order.cancelled': {
      const subject = `[${BRAND}] Đơn ${data.orderNumber} đã huỷ`
      const html = shell(
        'Đơn đã huỷ',
        `<p style="margin:0 0 12px;color:#222;">Đơn <strong>${data.orderNumber}</strong> đã được huỷ.</p>
         ${data.reason ? `<p style="margin:0 0 12px;color:#666;font-size:13px;">Lý do: ${escapeHtml(data.reason)}</p>` : ''}
         ${accountHint(data.orderNumber, 'Xem chi tiết trong trang đơn hàng.')}`
      )
      const text = `Đơn ${data.orderNumber} đã bị huỷ${data.reason ? ` — ${data.reason}` : ''}.`
      return { subject, html, text }
    }
    case 'order.refunded': {
      const subject = `[${BRAND}] Hoàn tiền đơn ${data.orderNumber}`
      const html = shell(
        'Đã hoàn tiền',
        `<p style="margin:0 0 12px;color:#222;">Đơn <strong>${data.orderNumber}</strong> đã hoàn <strong>${total}</strong>.</p>
         ${data.reason ? `<p style="margin:0 0 12px;color:#666;font-size:13px;">Lý do: ${escapeHtml(data.reason)}</p>` : ''}
         ${accountHint(data.orderNumber, 'Việc chuyển khoản được xử lý thủ công — có thể mất 1–3 ngày làm việc.')}`
      )
      const text = `Đơn ${data.orderNumber} đã hoàn ${total}${data.reason ? ` — ${data.reason}` : ''}.`
      return { subject, html, text }
    }
    case 'sla.breach': {
      const level = data.level ?? 1
      const minutesOver = data.minutesOver ?? 0
      const subject = `[${BRAND}] [SLA L${level}] Đơn ${data.orderNumber} quá hạn ${minutesOver}p`
      const html = shell(
        `SLA Breach · Level ${level}`,
        `<p style="margin:0 0 12px;color:#222;">Đơn <strong>${data.orderNumber}</strong> chưa giao sau <strong>${minutesOver} phút</strong>.</p>
         <p style="margin:0 0 12px;color:#666;font-size:13px;">Ngưỡng ${level}: ${data.reason ?? 'Giao hàng chậm — kiểm tra manual queue.'}</p>
         ${data.items.length > 0
           ? `<table style="width:100%;border-collapse:collapse;font-size:13px;">${itemRows(data.items)}</table>`
           : ''}`
      )
      const text = `SLA L${level}: ${data.orderNumber} quá hạn ${minutesOver}p. Mở: https://kandes.shop/admin/orders?q=${data.orderNumber}`
      return { subject, html, text }
    }
  }
}
