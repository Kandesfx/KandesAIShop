import type { NotificationEvent, NotificationData, ResolvedTemplate } from './types'
import {
  buildCorporateEmailShell,
  renderOrderPaidCorporateEmail,
  renderOrderDeliveredCorporateEmail,
  fmtVND,
  escapeHtml,
} from '@/lib/email-templates'

/**
 * Enterprise Transactional Email Templates — Kandes.shop
 */

const BRAND = 'Kandes.shop'

function itemRowsHtml(items: NotificationData['items']): string {
  return items
    .map(
      (it) => `
      <tr style="border-bottom: 1px solid #131824;">
        <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #FFFFFF;">${escapeHtml(it.name)}</td>
        <td align="center" style="padding: 10px 14px; font-size: 12px; color: #94A3B8; font-family: monospace;">x${it.quantity}</td>
        <td align="right" style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #00F0FF; font-family: monospace;">${fmtVND(it.unitPriceCents)}</td>
      </tr>`
    )
    .join('')
}

export function resolveTemplate(
  event: NotificationEvent,
  data: NotificationData
): ResolvedTemplate | null {
  const total = fmtVND(data.totalCents)
  const orderUrl = `https://kandes.shop/account/orders/${data.orderNumber}`

  switch (event) {
    case 'order.created': {
      const subject = `[${BRAND}] Xác nhận tạo đơn hàng ${data.orderNumber}`
      const contentHtml = `
        <p style="margin: 0 0 14px 0;">Cảm ơn bạn đã đặt hàng tại <strong>Kandes.shop</strong>.</p>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #94A3B8;">
          Vui lòng quét mã QR thanh toán hoặc chuyển khoản chính xác nội dung để hệ thống tự động kích hoạt đơn hàng trong 30 giây:
        </p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0; border: 1px solid #1E293B; border-radius: 6px; overflow: hidden; background-color: #06080C;">
          <thead>
            <tr style="background-color: #090C14; border-bottom: 1px solid #1E293B;">
              <th align="left" style="padding: 10px 14px; font-size: 11px; font-family: monospace; color: #94A3B8;">SẢN PHẨM</th>
              <th align="center" style="padding: 10px 14px; font-size: 11px; font-family: monospace; color: #94A3B8;">SL</th>
              <th align="right" style="padding: 10px 14px; font-size: 11px; font-family: monospace; color: #94A3B8;">ĐƠN GIÁ</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml(data.items)}
            <tr style="background-color: #090C14;">
              <td colspan="2" style="padding: 12px 14px; font-size: 13px; font-weight: 700; color: #FFFFFF;">Tổng thanh toán:</td>
              <td align="right" style="padding: 12px 14px; font-size: 15px; font-weight: 800; color: #00F0FF; font-family: monospace;">${total}</td>
            </tr>
          </tbody>
        </table>
      `
      const html = buildCorporateEmailShell({
        preheader: `Đơn hàng ${data.orderNumber} đã được tạo. Tổng tiền: ${total}`,
        badgeText: 'ĐƠN HÀNG MỚI',
        badgeColor: 'cyan',
        title: 'Đơn Hàng Đã Khởi Tạo',
        subtitle: `Mã đơn hàng: ${data.orderNumber}`,
        contentHtml,
        actionButton: {
          text: 'THANH TOÁN / THEO DÕI ĐƠN',
          url: `https://kandes.shop/order/${data.orderNumber}`,
          color: 'cyan',
        },
        supportConfig: { showSupportBox: true },
      })
      const text = `Đơn hàng ${data.orderNumber} đã tạo. Tổng: ${total}. Mở: https://kandes.shop/order/${data.orderNumber}`
      return { subject, html, text }
    }

    case 'order.paid': {
      return renderOrderPaidCorporateEmail({
        orderNumber: data.orderNumber,
        totalCents: data.totalCents,
        items: data.items,
      })
    }

    case 'order.delivered': {
      return renderOrderDeliveredCorporateEmail({
        orderNumber: data.orderNumber,
        totalCents: data.totalCents,
        items: data.items,
      })
    }

    case 'order.cancelled': {
      const subject = `[${BRAND}] Đơn hàng ${data.orderNumber} đã huỷ`
      const contentHtml = `
        <p style="margin: 0 0 14px 0;">Đơn hàng <strong>${data.orderNumber}</strong> của bạn đã bị huỷ.</p>
        ${data.reason ? `<p style="margin: 0 0 14px 0; padding: 10px 12px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #EF4444; font-size: 13px; color: #F87171;">Lý do: ${escapeHtml(data.reason)}</p>` : ''}
        <p style="margin: 0; font-size: 13px; color: #94A3B8;">Nếu bạn vẫn có nhu cầu sử dụng dịch vụ, bạn có thể tạo lại đơn hàng mới bất cứ lúc nào trên website Kandes.shop.</p>
      `
      const html = buildCorporateEmailShell({
        preheader: `Đơn hàng ${data.orderNumber} đã bị huỷ`,
        badgeText: 'ĐÃ HUỶ',
        badgeColor: 'red',
        title: 'Thông Báo Huỷ Đơn Hàng',
        subtitle: `Mã đơn hàng: ${data.orderNumber}`,
        contentHtml,
        actionButton: {
          text: 'TẠO ĐƠN HÀNG MỚI',
          url: 'https://kandes.shop/products',
          color: 'dark',
        },
        supportConfig: { showSupportBox: true },
      })
      const text = `Đơn ${data.orderNumber} đã bị huỷ${data.reason ? ` — ${data.reason}` : ''}.`
      return { subject, html, text }
    }

    case 'order.refunded': {
      const subject = `[${BRAND}] Xác nhận hoàn tiền đơn hàng ${data.orderNumber}`
      const contentHtml = `
        <p style="margin: 0 0 14px 0;">Đơn hàng <strong>${data.orderNumber}</strong> đã được thực hiện lệnh hoàn tiền số tiền <strong>${total}</strong>.</p>
        ${data.reason ? `<p style="margin: 0 0 14px 0; padding: 10px 12px; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #F59E0B; font-size: 13px; color: #FBBF24;">Lý do hoàn tiền: ${escapeHtml(data.reason)}</p>` : ''}
        <p style="margin: 0; font-size: 13px; color: #94A3B8;">Giao dịch hoàn tiền ngân hàng được xử lý thủ công và có thể mất từ 1 &ndash; 3 ngày làm việc để tiền về tài khoản của bạn.</p>
      `
      const html = buildCorporateEmailShell({
        preheader: `Đơn hàng ${data.orderNumber} đã được hoàn tiền ${total}`,
        badgeText: 'ĐÃ HOÀN TIỀN',
        badgeColor: 'amber',
        title: 'Xác Nhận Hoàn Tiền',
        subtitle: `Mã đơn hàng: ${data.orderNumber}`,
        contentHtml,
        actionButton: {
          text: 'XEM CHI TIẾT ĐƠN HÀNG',
          url: orderUrl,
          color: 'dark',
        },
        supportConfig: { showSupportBox: true },
      })
      const text = `Đơn ${data.orderNumber} đã hoàn ${total}${data.reason ? ` — ${data.reason}` : ''}.`
      return { subject, html, text }
    }

    case 'sla.breach': {
      const level = data.level ?? 1
      const minutesOver = data.minutesOver ?? 0
      const subject = `[${BRAND}] [SLA L${level}] Cảnh báo đơn ${data.orderNumber} quá hạn ${minutesOver}p`
      const contentHtml = `
        <p style="margin: 0 0 14px 0;">Đơn hàng <strong>${data.orderNumber}</strong> chưa được giao sau <strong>${minutesOver} phút</strong>.</p>
        <p style="margin: 0 0 14px 0; font-size: 13px; color: #F87171;">Ngưỡng cảnh báo SLA Cấp độ ${level}: ${escapeHtml(data.reason ?? 'Cần kiểm tra hàng đợi thủ công')}</p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0; border: 1px solid #1E293B; border-radius: 6px; overflow: hidden; background-color: #06080C;">
          <tbody>${itemRowsHtml(data.items)}</tbody>
        </table>
      `
      const html = buildCorporateEmailShell({
        badgeText: `SLA BREACH · L${level}`,
        badgeColor: 'red',
        title: `Cảnh Báo Quá Hạn SLA Đơn #${data.orderNumber}`,
        contentHtml,
        actionButton: {
          text: 'MỞ QUẢN TRỊ ĐƠN HÀNG',
          url: `https://kandes.shop/manage/orders?q=${data.orderNumber}`,
          color: 'dark',
        },
        supportConfig: { showSupportBox: false },
      })
      const text = `SLA L${level}: ${data.orderNumber} quá hạn ${minutesOver}p. Mở: https://kandes.shop/manage/orders?q=${data.orderNumber}`
      return { subject, html, text }
    }
  }
}
