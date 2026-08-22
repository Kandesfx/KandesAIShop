import type { EmailAlias, EmailAliasId } from './types'

export const EMAIL_ALIASES: Record<EmailAliasId, EmailAlias> = {
  support: {
    id: 'support',
    email: 'support@kandes.shop',
    name: 'Kandes Support Team',
    description: 'Hỗ trợ kỹ thuật, kích hoạt License Key AI & bảo hành',
    color: '#00F0FF',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/30',
    badgeText: 'text-cyan-400',
    defaultSignature: `
--
Đội ngũ Hỗ trợ Kỹ thuật | Kandes.shop
🌐 Website: https://kandes.shop
💬 Zalo Hỗ trợ: 0865.834.117
⚡ Hệ thống phân phối bản quyền AI Coding chính hãng 30s
    `.trim(),
    quickTemplates: [
      {
        title: '🔑 Bàn giao Key & Hướng dẫn',
        subject: 'Hướng dẫn kích hoạt License Key bản quyền AI',
        content: `Xin chào quý khách,\n\nCảm ơn bạn đã tin tưởng sử dụng dịch vụ của Kandes.shop.\n\nDưới đây là thông tin kích hoạt của bạn:\n- Loại tài khoản / Key: [TÊN SẢN PHẨM]\n- Mã bản quyền / Credentials: [MÃ BẢN QUYỀN HOẶC TÀI KHOẢN]\n- Thời hạn: [THỜI HẠN]\n\nHướng dẫn kích hoạt chi tiết:\n1. Mở phần mềm hoặc công cụ lập trình.\n2. Đăng nhập hoặc dán mã kích hoạt vào mục Settings / License.\n3. Nếu gặp bất kỳ khó khăn nào, bạn hãy phản hồi trực tiếp email này hoặc nhắn tin qua Zalo 0865.834.117 để được kỹ thuật viên hỗ trợ ngay nhé!`,
      },
      {
        title: '🛠️ Hỗ trợ kích hoạt / Fix lỗi',
        subject: 'Hỗ trợ xử lý kích hoạt dịch vụ Kandes.shop',
        content: `Xin chào quý khách,\n\nKỹ thuật viên Kandes.shop đã nhận được phản hồi về vấn đề kích hoạt của bạn.\n\nĐể hỗ trợ xử lý nhanh nhất, bạn vui lòng cung cấp thêm:\n1. Ảnh chụp màn hình thông báo lỗi hiển thị.\n2. Phiên bản hệ điều hành / IDE bạn đang sử dụng.\n\nKỹ thuật viên sẽ kiểm tra và phản hồi hướng xử lý cho bạn trong vài phút. Cảm ơn bạn!`,
      },
    ],
  },
  billing: {
    id: 'billing',
    email: 'billing@kandes.shop',
    name: 'Kandes Billing & Payment',
    description: 'Xác nhận thanh toán, hoàn tiền & hóa đơn GTGT',
    color: '#10B981',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
    badgeText: 'text-emerald-400',
    defaultSignature: `
--
Bộ phận Kế toán & Thanh toán | Kandes.shop
🌐 Website: https://kandes.shop
⚡ Tự động xác thực giao dịch VietQR 24/7
    `.trim(),
    quickTemplates: [
      {
        title: '💰 Xác nhận đã nhận thanh toán',
        subject: 'Xác nhận thanh toán thành công đơn hàng',
        content: `Xin chào quý khách,\n\nBộ phận Kế toán Kandes.shop xác nhận đã nhận được khoản thanh toán của bạn cho đơn hàng.\n\nHệ thống đã tự động chuyển trạng thái đơn hàng sang ĐÃ THANH TOÁN và bàn giao License Key đến bạn.\n\nNếu cần xuất hóa đơn hoặc hỗ trợ thêm, bạn vui lòng phản hồi email này nhé!`,
      },
      {
        title: '🔄 Thông báo hoàn tiền (Refund)',
        subject: 'Thông báo xử lý hoàn tiền đơn hàng',
        content: `Xin chào quý khách,\n\nKandes.shop đã tiến hành xử lý hoàn tiền cho giao dịch của bạn theo chính sách bảo hành / hoàn tiền của cửa hàng.\n\nSố tiền sẽ được hoàn về tài khoản ngân hàng của bạn trong vòng 1-24 giờ làm việc. Cảm ơn bạn đã đồng hành cùng Kandes.shop!`,
      },
    ],
  },
  sales: {
    id: 'sales',
    email: 'sales@kandes.shop',
    name: 'Kandes Sales & Enterprise',
    description: 'Tư vấn mua sắm, báo giá gói bản quyền nhóm & doanh nghiệp',
    color: '#F59E0B',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
    badgeText: 'text-amber-400',
    defaultSignature: `
--
Phòng Kinh doanh & Tư vấn Giải pháp | Kandes.shop
🌐 Website: https://kandes.shop
📞 Hotline / Zalo: 0865.834.117
    `.trim(),
    quickTemplates: [
      {
        title: '🏢 Báo giá gói Team / Doanh nghiệp',
        subject: 'Báo giá & Giải pháp AI Coding cho Doanh nghiệp / Team',
        content: `Kính gửi quý khách,\n\nCảm ơn bạn đã quan tâm đến giải pháp AI Coding của Kandes.shop dành cho đội ngũ lập trình viên.\n\nKandes.shop cung cấp các gói bản quyền chính hãng với mức chiết khấu hấp dẫn cho team từ 5 thành viên trở lên, hỗ trợ xuất hóa đơn và quản trị tập trung.\n\nChúng tôi rất mong có cơ hội trao đổi chi tiết hơn qua Zalo 0865.834.117 hoặc cuộc gọi thoại để tư vấn gói tối ưu nhất cho bạn!`,
      },
    ],
  },
  contact: {
    id: 'contact',
    email: 'contact@kandes.shop',
    name: 'Kandes Contact Center',
    description: 'Kênh tiếp nhận liên hệ chung từ website & biểu mẫu',
    color: '#8B5CF6',
    badgeBg: 'bg-purple-500/10 border-purple-500/30',
    badgeText: 'text-purple-400',
    defaultSignature: `
--
Ban Tiếp nhận Thông tin | Kandes.shop
🌐 Website: https://kandes.shop
    `.trim(),
    quickTemplates: [
      {
        title: '✉️ Phản hồi thư liên hệ',
        subject: 'Phản hồi yêu cầu liên hệ từ Kandes.shop',
        content: `Xin chào bạn,\n\nKandes.shop đã nhận được tin nhắn liên hệ của bạn qua website.\n\nChúng tôi xin phản hồi thông tin như sau:\n[NỘI DUNG PHẢN HỒI]\n\nNếu bạn cần thêm thông tin, hãy tiếp tục gửi thư hoặc nhắn tin qua Zalo 0865.834.117 để được phản hồi ngay nhé!`,
      },
    ],
  },
  admin: {
    id: 'admin',
    email: 'admin@kandes.shop',
    name: 'Kandes Administrator',
    description: 'Ban quản trị & điều hành hệ thống Kandes.shop',
    color: '#EC4899',
    badgeBg: 'bg-pink-500/10 border-pink-500/30',
    badgeText: 'text-pink-400',
    defaultSignature: `
--
Ban Quản trị | Kandes.shop
    `.trim(),
    quickTemplates: [],
  },
  noreply: {
    id: 'noreply',
    email: 'no-reply@kandes.shop',
    name: 'Kandes System Notifications',
    description: 'Hệ thống gửi thông báo tự động (Đơn hàng, OTP, Cảnh báo)',
    color: '#64748B',
    badgeBg: 'bg-slate-500/10 border-slate-500/30',
    badgeText: 'text-slate-400',
    defaultSignature: `
--
Thư thông báo tự động từ hệ thống Kandes.shop
    `.trim(),
    quickTemplates: [],
  },
}

export function getAliasByEmail(email: string): EmailAlias {
  const normalized = email.toLowerCase().trim()
  for (const alias of Object.values(EMAIL_ALIASES)) {
    if (normalized.includes(alias.email.toLowerCase()) || normalized.includes(alias.id)) {
      return alias
    }
  }
  return EMAIL_ALIASES.support
}

export function getAllAliases(): EmailAlias[] {
  return Object.values(EMAIL_ALIASES)
}
