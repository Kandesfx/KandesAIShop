import type { SettingCategoryDef, SettingFieldDef, SettingCategoryKey } from './types'

/**
 * Settings registry — P4-06.
 *
 * Single source of truth cho 5 categories + fields. Mọi nơi (admin form,
 * API validator, seed defaults, test) đều derive từ registry này.
 *
 * Khi thêm field mới:
 *   1. Thêm entry vào đúng category bên dưới.
 *   2. Nếu field có env counterpart: cập nhật `envVar`.
 *   3. (Optional) Update seed defaults trong prisma/seed.ts nếu cần bootstrap value.
 */

const generalFields: SettingFieldDef[] = [
  {
    key: 'shop.name',
    label: 'Tên shop',
    description: 'Tên hiển thị trên website, email, hoá đơn.',
    type: 'text',
    required: true,
    maxLength: 120,
    defaultValue: 'Kandes Shop',
  },
  {
    key: 'shop.slogan',
    label: 'Slogan',
    type: 'text',
    maxLength: 200,
    defaultValue: '',
  },
  {
    key: 'shop.logoUrl',
    label: 'Logo URL',
    description: 'URL công khai. Nên upload lên R2/S3 trước.',
    type: 'url',
    defaultValue: '',
  },
  {
    key: 'shop.email',
    label: 'Email liên hệ',
    type: 'email',
    defaultValue: 'support@kandes.shop',
  },
  {
    key: 'shop.phone',
    label: 'Số điện thoại',
    type: 'text',
    maxLength: 20,
    defaultValue: '',
  },
  {
    key: 'shop.address',
    label: 'Địa chỉ',
    type: 'textarea',
    maxLength: 500,
    defaultValue: '',
  },
  {
    key: 'shop.taxId',
    label: 'Mã số thuế',
    type: 'text',
    maxLength: 20,
    defaultValue: '',
  },
  {
    key: 'shop.currency',
    label: 'Đơn vị tiền tệ',
    type: 'select',
    options: ['VND', 'USD'],
    required: true,
    defaultValue: 'VND',
  },
  {
    key: 'shop.timezone',
    label: 'Múi giờ',
    type: 'text',
    maxLength: 50,
    defaultValue: 'Asia/Ho_Chi_Minh',
  },
  {
    key: 'seo.metaTitle',
    label: 'SEO — Meta title',
    type: 'text',
    maxLength: 200,
    defaultValue: 'Kandes.shop — Cửa hàng sản phẩm AI',
  },
  {
    key: 'seo.metaDescription',
    label: 'SEO — Meta description',
    type: 'textarea',
    maxLength: 500,
    defaultValue: '',
  },
]

const paymentFields: SettingFieldDef[] = [
  {
    key: 'payment.sepayEnabled',
    label: 'Bật thanh toán SePay (QR VietQR)',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'payment.sepayApiToken',
    label: 'SePay API Token',
    description: 'Token để gọi SePay REST API (reconcile cron).',
    type: 'password',
    sensitive: true,
    envVar: 'SEPAY_API_TOKEN',
  },
  {
    key: 'payment.sepayWebhookSecret',
    label: 'SePay Webhook Secret',
    description: 'HMAC secret dùng verify webhook signature.',
    type: 'password',
    sensitive: true,
    envVar: 'SEPAY_WEBHOOK_SECRET',
  },
  {
    key: 'payment.sepayBankCode',
    label: 'Ngân hàng (bank code)',
    type: 'select',
    options: ['VCB', 'TCB', 'BIDV', 'MBB', 'ACB', 'VPB', 'TPB', 'STB'],
    defaultValue: 'VCB',
  },
  {
    key: 'payment.sepayAccountNumber',
    label: 'Số tài khoản',
    type: 'text',
    maxLength: 30,
    envVar: 'SEPAY_ACCOUNT_NUMBER',
  },
  {
    key: 'payment.sepayAccountName',
    label: 'Tên tài khoản',
    type: 'text',
    maxLength: 100,
    envVar: 'SEPAY_ACCOUNT_NAME',
  },
  {
    key: 'payment.sepayQrTemplate',
    label: 'Template QR',
    type: 'select',
    options: ['compact', 'compact2', 'qr_only'],
    defaultValue: 'compact2',
  },
  {
    key: 'payment.contentPattern',
    label: 'Cú pháp nội dung CK',
    description: 'Read-only — pattern đã được chốt trong CONTEXT (D6/D7).',
    type: 'text',
    defaultValue: 'KDS-YYYYMMDD-XXXX (full) | KDS XXXX (short)',
  },
]

const emailFields: SettingFieldDef[] = [
  {
    key: 'email.fromEmail',
    label: 'From email',
    type: 'email',
    required: true,
    defaultValue: 'no-reply@kandes.shop',
  },
  {
    key: 'email.fromName',
    label: 'From name',
    type: 'text',
    maxLength: 120,
    defaultValue: 'Kandes Shop',
  },
  {
    key: 'email.replyTo',
    label: 'Reply-to',
    type: 'email',
    defaultValue: '',
  },
  {
    key: 'email.resendApiKey',
    label: 'Resend API key',
    type: 'password',
    sensitive: true,
    envVar: 'RESEND_API_KEY',
  },
  {
    key: 'email.testRecipient',
    label: 'Email nhận test mặc định',
    description: 'Dùng cho nút "Test gửi email" trong admin.',
    type: 'email',
    defaultValue: '',
  },
  {
    key: 'email.providerNote',
    label: 'Email provider (read-only)',
    description: 'Provider thật (console/resend/ses) đọc từ EMAIL_PROVIDER env.',
    type: 'text',
    envVar: 'EMAIL_PROVIDER',
  },
]

const notificationFields: SettingFieldDef[] = [
  {
    key: 'notification.emailEnabled',
    label: 'Bật kênh Email',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'notification.telegramEnabled',
    label: 'Bật kênh Telegram',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'notification.telegramBotToken',
    label: 'Telegram Bot Token',
    type: 'password',
    sensitive: true,
    envVar: 'TELEGRAM_BOT_TOKEN',
  },
  {
    key: 'notification.telegramAdminChatId',
    label: 'Telegram Admin Chat ID',
    type: 'text',
    maxLength: 30,
    envVar: 'TELEGRAM_ADMIN_CHAT_ID',
  },
  {
    key: 'notification.zaloEnabled',
    label: 'Bật kênh Zalo OA',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'notification.zaloAccessToken',
    label: 'Zalo OA Access Token',
    type: 'password',
    sensitive: true,
    envVar: 'ZALO_OA_ACCESS_TOKEN',
  },
  {
    key: 'notification.smsEnabled',
    label: 'Bật kênh SMS (Twilio)',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'notification.voiceEnabled',
    label: 'Bật kênh Voice Call (Twilio)',
    type: 'boolean',
    defaultValue: false,
  },
]

const slaFields: SettingFieldDef[] = [
  {
    key: 'sla.globalThreshold1Min',
    label: 'Ngưỡng 1 (phút)',
    description: 'Sau khi đơn MANUAL quá thời gian này → alert level 1.',
    type: 'number',
    min: 1,
    max: 10080,
    required: true,
    defaultValue: 30,
  },
  {
    key: 'sla.globalThreshold2Min',
    label: 'Ngưỡng 2 (phút)',
    type: 'number',
    min: 1,
    max: 10080,
    required: true,
    defaultValue: 60,
  },
  {
    key: 'sla.globalThreshold3Min',
    label: 'Ngưỡng 3 (phút)',
    type: 'number',
    min: 1,
    max: 10080,
    required: true,
    defaultValue: 120,
  },
  {
    key: 'sla.globalAutoCancelAtMin',
    label: 'Auto-cancel sau (phút)',
    description: 'Optional. Nếu set, đơn MANUAL bị cancel khi quá ngưỡng này.',
    type: 'number',
    min: 1,
    max: 43200,
    required: false,
  },
  {
    key: 'sla.notifyChannels',
    label: 'Kênh thông báo mặc định',
    type: 'multiselect',
    options: ['email', 'telegram', 'zalo', 'sms', 'voice'],
    defaultValue: ['email', 'telegram'],
  },
]

export const SETTINGS_REGISTRY: readonly SettingCategoryDef[] = [
  {
    key: 'general',
    label: 'Cài đặt chung',
    description: 'Tên shop, logo, địa chỉ, MST, đơn vị tiền tệ và SEO mặc định.',
    fields: generalFields,
  },
  {
    key: 'payment',
    label: 'Thanh toán',
    description: 'Cấu hình SePay QR. Token/secret đọc từ env lúc startup; UI chỉ xem và audit.',
    fields: paymentFields,
  },
  {
    key: 'email',
    label: 'Email',
    description: 'From email, from name, reply-to và test recipient.',
    fields: emailFields,
  },
  {
    key: 'notifications',
    label: 'Thông báo',
    description: 'Bật/tắt từng kênh (Telegram, Zalo, SMS, Voice). Wire tới provider thật ở Phase 5.',
    fields: notificationFields,
  },
  {
    key: 'sla',
    label: 'SLA',
    description: 'Ngưỡng thời gian + kênh thông báo cho đơn MANUAL. SlaConfig chi tiết theo product qua sub-tab.',
    fields: slaFields,
  },
] as const

const REGISTRY_MAP = new Map<SettingCategoryKey, SettingCategoryDef>(
  SETTINGS_REGISTRY.map((c) => [c.key, c])
)

export function getCategoryDef(key: string): SettingCategoryDef | null {
  return REGISTRY_MAP.get(key as SettingCategoryKey) ?? null
}

export function listCategoryKeys(): SettingCategoryKey[] {
  return SETTINGS_REGISTRY.map((c) => c.key)
}
