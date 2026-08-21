/**
 * Kandes.shop — Enterprise Corporate Email Template System
 * 
 * Thiết kế chuẩn doanh nghiệp, tối ưu hiển thị trên mọi trình duyệt & ứng dụng mail
 * (Gmail, Outlook, Apple Mail, Webmail).
 * 
 * Màu sắc nhận diện:
 *   - Nền tối cao cấp: #090B10 & #0F131C
 *   - Cyan công nghệ: #00F0FF
 *   - Plasma Purple: #8B5CF6
 *   - Emerald Green: #10B981
 */

export interface EmailActionBtn {
  text: string
  url: string
  color?: 'cyan' | 'purple' | 'green' | 'dark'
}

export interface EmailSupportConfig {
  showSupportBox?: boolean
  zaloAdmin?: string
  zaloGroup?: string
  faqUrl?: string
}

export interface CorporateShellOptions {
  preheader?: string
  badgeText?: string
  badgeColor?: 'cyan' | 'purple' | 'green' | 'amber' | 'red'
  title: string
  subtitle?: string
  contentHtml: string
  actionButton?: EmailActionBtn
  supportConfig?: EmailSupportConfig
  footerNote?: string
}

const LOGO_URL = 'https://kandes.shop/assets/brand/logo.png'
const BRAND_URL = 'https://kandes.shop'
const ZALO_ADMIN_URL = 'https://zalo.me/0865834117'
const ZALO_GROUP_URL = 'https://zalo.me/g/1wpnubuk0nzczx5n8jbl'
const FAQ_URL = 'https://kandes.shop/help/faq'

function getBadgeColors(color: CorporateShellOptions['badgeColor'] = 'cyan') {
  switch (color) {
    case 'green':
      return { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#34D399' }
    case 'purple':
      return { bg: 'rgba(139, 92, 246, 0.15)', border: '#8B5CF6', text: '#C084FC' }
    case 'amber':
      return { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#FBBF24' }
    case 'red':
      return { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', text: '#F87171' }
    case 'cyan':
    default:
      return { bg: 'rgba(0, 240, 255, 0.12)', border: '#00F0FF', text: '#00F0FF' }
  }
}

function getButtonStyles(color: EmailActionBtn['color'] = 'cyan') {
  switch (color) {
    case 'purple':
      return 'background: #8B5CF6; color: #FFFFFF;'
    case 'green':
      return 'background: #10B981; color: #FFFFFF;'
    case 'dark':
      return 'background: #1E293B; color: #F8FAFC; border: 1px solid #334155;'
    case 'cyan':
    default:
      return 'background: #00F0FF; color: #090B10;'
  }
}

export function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function fmtVND(amount: string | number | bigint): string {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '0 đ'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n)
}

/**
 * Khung email chuẩn doanh nghiệp (Master Shell)
 */
export function buildCorporateEmailShell(options: CorporateShellOptions): string {
  const {
    preheader = 'Kandes.shop — Nền tảng công cụ AI Coding bản quyền',
    badgeText,
    badgeColor = 'cyan',
    title,
    subtitle,
    contentHtml,
    actionButton,
    supportConfig = { showSupportBox: true },
    footerNote,
  } = options

  const badge = getBadgeColors(badgeColor)
  const showSupport = supportConfig.showSupportBox !== false

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
      .email-content { padding: 20px 16px !important; }
      .header-pad { padding: 18px 16px !important; }
      .footer-pad { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #06080C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  
  <!-- Preheader text (hidden preview in inbox) -->
  <div style="display: none; font-size: 1px; color: #06080C; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeHtml(preheader)}
  </div>

  <!-- Outer Background Table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #06080C; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        
        <!-- Main Email Container (600px Max) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #0D111A; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Cyber Glow Bar -->
          <tr>
            <td height="3" style="background: linear-gradient(90deg, #00F0FF 0%, #8B5CF6 50%, #00F0FF 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <!-- Header with Logo & Brand Name -->
          <tr>
            <td class="header-pad" style="padding: 24px 32px; background-color: #090C14; border-bottom: 1px solid #1E293B;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <a href="${BRAND_URL}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align: middle; padding-right: 12px;">
                            <img src="${LOGO_URL}" alt="Kandes.shop Logo" width="38" height="38" style="display: block; border-radius: 8px; border: 1px solid rgba(0, 240, 255, 0.4);">
                          </td>
                          <td style="vertical-align: middle;">
                            <span style="font-size: 19px; font-weight: 800; letter-spacing: 0.08em; color: #FFFFFF; font-family: monospace, sans-serif;">
                              KANDES<span style="color: #00F0FF;">.SHOP</span>
                            </span>
                            <span style="display: block; font-size: 10px; color: #94A3B8; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase;">
                              AI Coding Tools Marketplace
                            </span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; font-size: 10px; font-family: monospace; color: #00F0FF; background-color: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.3); padding: 4px 8px; border-radius: 4px; letter-spacing: 0.1em; text-transform: uppercase;">
                      AUTO 30S
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Hero & Title Area -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 20px 32px;">
              ${badgeText ? `
              <div style="margin-bottom: 12px;">
                <span style="display: inline-block; font-size: 11px; font-weight: 700; font-family: monospace; letter-spacing: 0.15em; text-transform: uppercase; color: ${badge.text}; background-color: ${badge.bg}; border: 1px solid ${badge.border}; padding: 4px 10px; border-radius: 4px;">
                  [ ${escapeHtml(badgeText)} ]
                </span>
              </div>` : ''}
              
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #FFFFFF; line-height: 1.3; letter-spacing: -0.01em;">
                ${escapeHtml(title)}
              </h1>
              
              ${subtitle ? `
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #94A3B8; line-height: 1.5;">
                ${escapeHtml(subtitle)}
              </p>` : '<div style="margin-bottom: 20px;"></div>'}

              <!-- Main Content Body -->
              <div style="color: #CBD5E1; font-size: 14px; line-height: 1.6;">
                ${contentHtml}
              </div>

              <!-- Action CTA Button -->
              ${actionButton ? `
              <div style="margin: 28px 0 10px 0; text-align: center;">
                <a href="${actionButton.url}" target="_blank" style="display: inline-block; ${getButtonStyles(actionButton.color)} font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 6px; letter-spacing: 0.04em; text-transform: uppercase; box-shadow: 0 4px 14px rgba(0, 240, 255, 0.25);">
                  ${escapeHtml(actionButton.text)} &rarr;
                </a>
              </div>` : ''}

            </td>
          </tr>

          <!-- Support & Reassurance Callout Box -->
          ${showSupport ? `
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #090C14; border: 1px solid #1E293B; border-left: 3px solid #00F0FF; border-radius: 6px; padding: 16px;">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; font-weight: 700; color: #FFFFFF; padding-bottom: 6px;">
                          💬 Cần hỗ trợ kích hoạt hoặc tư vấn dịch vụ?
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #94A3B8; line-height: 1.5; padding-bottom: 12px;">
                          Đội ngũ kỹ thuật Kandes.shop luôn sẵn sàng hỗ trợ bạn nhanh chóng qua các kênh chính thức:
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 14px;">
                                <a href="${supportConfig.zaloAdmin ?? ZALO_ADMIN_URL}" target="_blank" style="font-size: 12px; font-family: monospace; font-weight: 700; color: #00F0FF; text-decoration: none; display: inline-block;">
                                  &bull; Zalo Admin: 0865.834.117 &rarr;
                                </a>
                              </td>
                              <td style="padding-right: 14px;">
                                <a href="${supportConfig.zaloGroup ?? ZALO_GROUP_URL}" target="_blank" style="font-size: 12px; font-family: monospace; color: #C084FC; text-decoration: none; display: inline-block;">
                                  &bull; Nhóm Zalo Hỗ Trợ &rarr;
                                </a>
                              </td>
                              <td>
                                <a href="${supportConfig.faqUrl ?? FAQ_URL}" target="_blank" style="font-size: 12px; color: #94A3B8; text-decoration: underline; display: inline-block;">
                                  Câu hỏi thường gặp
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- Footer Area -->
          <tr>
            <td class="footer-pad" style="padding: 24px 32px; background-color: #07090F; border-top: 1px solid #1E293B; text-align: center;">
              ${footerNote ? `
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                ${escapeHtml(footerNote)}
              </p>` : ''}
              
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748B; font-family: monospace;">
                KANDES.SHOP &bull; HIGH-PERFORMANCE AI CODING INFRASTRUCTURE
              </p>
              
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #475569; line-height: 1.4;">
                Cursor Pro &bull; Claude Code Agent &bull; Codex GPT VSCode &bull; Tự động hóa bản quyền
              </p>
              
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; 2026 Kandes.shop. Email này được gửi tự động, vui lòng không phản hồi trực tiếp.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Main Container -->

      </td>
    </tr>
  </table>

</body>
</html>`
}

/**
 * 1. Email Mã xác thực OTP
 */
export function renderOtpCorporateEmail(code: string, purpose: 'login' | 'register' | 'verify' | 'reset' = 'login') {
  const labelMap = {
    login: 'Đăng nhập vào hệ thống',
    register: 'Xác nhận tạo tài khoản mới',
    verify: 'Xác minh địa chỉ Email',
    reset: 'Khôi phục mật khẩu tài khoản',
  }

  const actionText = labelMap[purpose] || 'Xác thực tài khoản'

  const contentHtml = `
    <p style="margin: 0 0 16px 0;">
      Xin chào quý khách, hệ thống nhận được yêu cầu <strong>${escapeHtml(actionText)}</strong> của bạn trên Kandes.shop.
    </p>
    
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8;">
      Vui lòng nhập mã xác thực OTP dùng một lần dưới đây để hoàn tất:
    </p>

    <!-- OTP Display Box -->
    <div style="margin: 24px 0; padding: 20px; background-color: #06080C; border: 1px dashed #00F0FF; border-radius: 8px; text-align: center;">
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #00F0FF; display: inline-block;">
        ${escapeHtml(code)}
      </span>
      <div style="font-size: 11px; color: #64748B; margin-top: 8px; font-family: monospace;">
        MÃ CÓ HIỆU LỰC TRONG 10 PHÚT
      </div>
    </div>

    <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
      ⚠️ <strong>Lưu ý bảo mật:</strong> Không cung cấp mã OTP này cho bất kỳ ai, kể cả nhân viên hỗ trợ Kandes. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
    </p>
  `

  return {
    subject: `[Kandes.shop] Mã xác thực OTP: ${code} — ${actionText}`,
    text: `Mã xác thực OTP của bạn tại Kandes.shop là: ${code}\nMục đích: ${actionText}\nMã có hiệu lực trong 10 phút. Không chia sẻ mã này cho người khác.`,
    html: buildCorporateEmailShell({
      preheader: `Mã xác thực OTP của bạn là ${code} (hiệu lực trong 10 phút)`,
      badgeText: 'XÁC THỰC BẢO MẬT',
      badgeColor: 'cyan',
      title: 'Mã Xác Thực OTP',
      subtitle: `Yêu cầu: ${actionText}`,
      contentHtml,
      supportConfig: { showSupportBox: true },
    }),
  }
}

/**
 * 2. Email Đặt lại mật khẩu
 */
export function renderPasswordResetCorporateEmail(resetUrl: string, expiresAt: Date) {
  const minutes = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000))

  const contentHtml = `
    <p style="margin: 0 0 16px 0;">
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>Kandes.shop</strong>.
    </p>
    
    <p style="margin: 0 0 16px 0;">
      Để thiết lập mật khẩu mới, vui lòng bấm vào nút bên dưới (liên kết có hiệu lực trong <strong>${minutes} phút</strong>):
    </p>

    <div style="margin: 20px 0; padding: 14px; background-color: #06080C; border: 1px solid #1E293B; border-radius: 6px; font-size: 12px; color: #94A3B8; word-break: break-all;">
      <span style="color: #64748B; display: block; margin-bottom: 4px;">Đường dẫn khôi phục trực tiếp:</span>
      <a href="${resetUrl}" style="color: #8B5CF6; text-decoration: none;">${resetUrl}</a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
      Nếu bạn không yêu cầu đặt lại mật khẩu, tài khoản của bạn vẫn hoàn toàn an toàn và bạn có thể an tâm bỏ qua email này.
    </p>
  `

  return {
    subject: '[Kandes.shop] Yêu cầu đặt lại mật khẩu tài khoản',
    text: `Chào bạn,\n\nBạn đã yêu cầu đặt lại mật khẩu trên Kandes.shop.\nTruy cập đường dẫn sau để thiết lập mật khẩu mới (hiệu lực ${minutes} phút):\n${resetUrl}\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email.`,
    html: buildCorporateEmailShell({
      preheader: `Yêu cầu đặt lại mật khẩu tài khoản Kandes.shop (hiệu lực ${minutes} phút)`,
      badgeText: 'BẢO MẬT TÀI KHOẢN',
      badgeColor: 'purple',
      title: 'Đặt Lại Mật Khẩu',
      subtitle: 'Thiết lập mật khẩu mới cho tài khoản của bạn',
      contentHtml,
      actionButton: {
        text: 'ĐẶT LẠI MẬT KHẨU NGAY',
        url: resetUrl,
        color: 'purple',
      },
      supportConfig: { showSupportBox: true },
    }),
  }
}

/**
 * 3. Email Xác nhận thanh toán & Đang xử lý cấp key (Order Paid / Processing)
 */
export function renderOrderPaidCorporateEmail(data: {
  orderNumber: string
  totalCents: string | number | bigint
  currency?: string
  items: Array<{ name: string; quantity: number; unitPriceCents: string | number | bigint }>
  customerName?: string
}) {
  const total = fmtVND(data.totalCents)

  const itemsTableHtml = `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0; border: 1px solid #1E293B; border-radius: 6px; overflow: hidden; background-color: #06080C;">
      <thead>
        <tr style="background-color: #090C14; border-bottom: 1px solid #1E293B;">
          <th align="left" style="padding: 10px 14px; font-size: 11px; font-family: monospace; color: #94A3B8; text-transform: uppercase;">Sản phẩm</th>
          <th align="center" style="padding: 10px 14px; font-size: 11px; font-family: monospace; color: #94A3B8; text-transform: uppercase;">SL</th>
          <th align="right" style="padding: 10px 14px; font-size: 11px; font-family: monospace; color: #94A3B8; text-transform: uppercase;">Đơn giá</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((it) => `
          <tr style="border-bottom: 1px solid #131824;">
            <td style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: #FFFFFF;">
              ${escapeHtml(it.name)}
            </td>
            <td align="center" style="padding: 12px 14px; font-size: 12px; color: #94A3B8; font-family: monospace;">
              x${it.quantity}
            </td>
            <td align="right" style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: #00F0FF; font-family: monospace;">
              ${fmtVND(it.unitPriceCents)}
            </td>
          </tr>
        `).join('')}
        <tr style="background-color: #090C14;">
          <td colspan="2" style="padding: 12px 14px; font-size: 13px; font-weight: 700; color: #FFFFFF;">
            Tổng tiền thanh toán:
          </td>
          <td align="right" style="padding: 12px 14px; font-size: 15px; font-weight: 800; color: #00F0FF; font-family: monospace;">
            ${total}
          </td>
        </tr>
      </tbody>
    </table>
  `

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">
      Xin chào ${escapeHtml(data.customerName || 'quý khách')},
    </p>
    
    <p style="margin: 0 0 16px 0; line-height: 1.6;">
      Hệ thống <strong>Kandes.shop</strong> đã ghi nhận thanh toán thành công số tiền <strong>${total}</strong> cho đơn hàng <strong style="color: #00F0FF; font-family: monospace;">${escapeHtml(data.orderNumber)}</strong>.
    </p>

    <!-- Notice Box -->
    <div style="margin: 20px 0; padding: 16px; background-color: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 6px;">
      <div style="font-size: 14px; font-weight: 700; color: #00F0FF; margin-bottom: 6px;">
        ⏱️ Đơn hàng đang được xử lý & bàn giao
      </div>
      <p style="margin: 0; font-size: 13px; color: #CBD5E1; line-height: 1.5;">
        Kỹ thuật viên đang chuẩn bị và cấp mã Key / tài khoản cho bạn sau ít phút (thông thường từ <strong>2 &ndash; 10 phút</strong>). Khi hoàn tất, mã kích hoạt sẽ được gửi ngay về Email này và hiển thị trong chi tiết đơn hàng của bạn.
      </p>
    </div>

    ${itemsTableHtml}

    <p style="margin: 16px 0 0 0; font-size: 13px; color: #94A3B8;">
      Bạn có thể theo dõi tiến độ xử lý và xem lại thông tin chi tiết đơn hàng bằng cách bấm nút bên dưới:
    </p>
  `

  const orderUrl = `https://kandes.shop/account/orders/${data.orderNumber}`

  return {
    subject: `[Kandes.shop] Đã nhận thanh toán đơn hàng ${data.orderNumber} — Đang xử lý`,
    text: `Kandes.shop đã nhận thanh toán ${total} cho đơn hàng ${data.orderNumber}.\nĐơn hàng đang được kỹ thuật viên xử lý và bàn giao trong 2-10 phút.\nXem đơn hàng: ${orderUrl}\nLiên hệ Zalo Admin nếu cần hỗ trợ gấp: 0865834117 (https://zalo.me/0865834117)`,
    html: buildCorporateEmailShell({
      preheader: `Thanh toán thành công ${total} cho đơn ${data.orderNumber}. Đơn đang được cấp key...`,
      badgeText: 'ĐÃ THANH TOÁN · ĐANG XỬ LÝ',
      badgeColor: 'cyan',
      title: 'Xác Nhận Thanh Toán Thành Công',
      subtitle: `Mã đơn hàng: ${data.orderNumber}`,
      contentHtml,
      actionButton: {
        text: 'XEM CHI TIẾT ĐƠN HÀNG',
        url: orderUrl,
        color: 'cyan',
      },
      supportConfig: { showSupportBox: true },
    }),
  }
}

/**
 * 4. Email Bàn giao Key / Đã giao hàng (Order Delivered)
 */
export function renderOrderDeliveredCorporateEmail(data: {
  orderNumber: string
  totalCents: string | number | bigint
  items: Array<{ name: string; quantity: number; unitPriceCents: string | number | bigint }>
  customerName?: string
  licenseKeySnippet?: string
}) {
  const total = fmtVND(data.totalCents)
  const orderUrl = `https://kandes.shop/account/orders/${data.orderNumber}`

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">
      Xin chào ${escapeHtml(data.customerName || 'quý khách')},
    </p>
    
    <p style="margin: 0 0 16px 0; line-height: 1.6;">
      Đơn hàng <strong style="color: #34D399; font-family: monospace;">${escapeHtml(data.orderNumber)}</strong> của bạn đã được kỹ thuật viên <strong>bàn giao thành công</strong>!
    </p>

    <!-- Key Delivery Box -->
    <div style="margin: 20px 0; padding: 20px; background-color: #06080C; border: 1px solid #10B981; border-radius: 8px; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.15);">
      <div style="font-size: 13px; font-weight: 700; color: #34D399; text-transform: uppercase; font-family: monospace; margin-bottom: 8px;">
        🔑 THÔNG TIN BẢN QUYỀN / LICENSE KEY
      </div>
      
      ${data.licenseKeySnippet ? `
      <div style="padding: 12px; background-color: #0D111A; border: 1px dashed #334155; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 15px; color: #FFFFFF; word-break: break-all; margin-bottom: 10px;">
        ${escapeHtml(data.licenseKeySnippet)}
      </div>` : ''}

      <p style="margin: 0; font-size: 13px; color: #CBD5E1; line-height: 1.5;">
        Bạn có thể đăng nhập vào trang web và mở mục <strong>Đơn hàng của tôi</strong> để hiển thị toàn bộ nội dung, mã bản quyền và hướng dẫn cài đặt chi tiết bất cứ lúc nào.
      </p>
    </div>

    <!-- Items List Summary -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0; border: 1px solid #1E293B; border-radius: 6px; overflow: hidden; background-color: #06080C;">
      <tbody>
        ${data.items.map((it) => `
          <tr style="border-bottom: 1px solid #131824;">
            <td style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: #FFFFFF;">
              ${escapeHtml(it.name)}
            </td>
            <td align="center" style="padding: 12px 14px; font-size: 12px; color: #94A3B8; font-family: monospace;">
              x${it.quantity}
            </td>
            <td align="right" style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: #34D399; font-family: monospace;">
              ${fmtVND(it.unitPriceCents)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <p style="margin: 16px 0 0 0; font-size: 13px; color: #94A3B8;">
      Bấm nút bên dưới để mở giao diện quản lý và kích hoạt bản quyền:
    </p>
  `

  return {
    subject: `[Kandes.shop] Đã bàn giao License Key đơn hàng ${data.orderNumber}`,
    text: `Đơn hàng ${data.orderNumber} của bạn đã được giao thành công!\nMở đơn hàng để xem key và hướng dẫn: ${orderUrl}`,
    html: buildCorporateEmailShell({
      preheader: `Đơn hàng ${data.orderNumber} đã được bàn giao thành công. Mở để nhận key...`,
      badgeText: 'ĐÃ BÀN GIAO THÀNH CÔNG',
      badgeColor: 'green',
      title: 'Bàn Giao Bản Quyền Thành Công',
      subtitle: `Mã đơn hàng: ${data.orderNumber}`,
      contentHtml,
      actionButton: {
        text: 'MỞ ĐƠN HÀNG ĐỂ NHẬN KEY',
        url: orderUrl,
        color: 'green',
      },
      supportConfig: { showSupportBox: true },
    }),
  }
}

/**
 * 5. Email Phản hồi Hỗ trợ Khách hàng (Support Desk Reply)
 */
export function renderSupportReplyCorporateEmail(data: {
  ticketId: string
  customerName?: string
  replyContent: string
  serviceName?: string
}) {
  const contentHtml = `
    <p style="margin: 0 0 14px 0;">
      Xin chào <strong>${escapeHtml(data.customerName || 'quý khách')}</strong>,
    </p>
    
    <p style="margin: 0 0 16px 0; line-height: 1.6;">
      Đội ngũ Chăm sóc & Hỗ trợ kỹ thuật <strong>Kandes.shop</strong> đã tiếp nhận và phản hồi yêu cầu hỗ trợ 
      <strong style="color: #38BDF8; font-family: monospace;">#${escapeHtml(data.ticketId)}</strong>${data.serviceName ? ` liên quan đến dịch vụ <strong>${escapeHtml(data.serviceName)}</strong>` : ''}:
    </p>

    <!-- Support Message Card -->
    <div style="margin: 20px 0; padding: 20px; background-color: #06080C; border: 1px solid #1E293B; border-left: 4px solid #38BDF8; border-radius: 0 8px 8px 0;">
      <div style="font-size: 11px; font-weight: 700; color: #38BDF8; text-transform: uppercase; font-family: monospace; margin-bottom: 8px;">
        💬 NỘI DUNG PHẢN HỒI TỪ KỸ THUẬT VIÊN:
      </div>
      <div style="font-size: 14px; color: #F1F5F9; line-height: 1.7; white-space: pre-wrap;">
        ${escapeHtml(data.replyContent)}
      </div>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">
      Nếu bạn có thêm câu hỏi hoặc cần giải đáp chi tiết hơn, bạn có thể trả lời trực tiếp email này hoặc nhắn tin nhanh qua Zalo Admin để được hỗ trợ 1-1.
    </p>
  `

  return {
    subject: `[Kandes.shop Support] Phản hồi yêu cầu hỗ trợ #${data.ticketId}`,
    text: `Xin chào ${data.customerName || 'quý khách'},\n\nĐội ngũ Kandes.shop đã phản hồi yêu cầu #${data.ticketId}:\n\n${data.replyContent}\n\nLiên hệ Zalo Admin nếu cần hỗ trợ thêm: 0865834117`,
    html: buildCorporateEmailShell({
      preheader: `Kandes Support đã phản hồi yêu cầu #${data.ticketId}`,
      badgeText: 'HỖ TRỢ KHÁCH HÀNG',
      badgeColor: 'cyan',
      title: 'Phản Hồi Yêu Cầu Hỗ Trợ',
      subtitle: `Mã phiếu: #${data.ticketId}`,
      contentHtml,
      supportConfig: { showSupportBox: true },
    }),
  }
}
