import { PrismaClient, DeliveryStrategy, StockStatus } from '@prisma/client'

const db = new PrismaClient()

const PRODUCTS_TO_SYNC = [
  {
    slug: 'cursor-pro',
    name: 'Cursor Pro',
    sku: 'CRS-PRO',
    categorySlug: 'ai-code',
    shortDescription: 'Hỗ trợ nhiều mô hình cao cấp: Opus, Sonnet, GPT, Grok...',
    description:
      'Cursor Pro là AI code editor hàng đầu, hỗ trợ đầy đủ các mô hình cao cấp nhất: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3 Opus, GPT-4o, GPT-5, Grok... Tự động hoàn thành mã nguồn, chỉnh sửa đa file (multi-file editing) và chế độ Agent thông minh.',
    priceCents: 5500000n, // 55.000 đ (giá gốc gói thấp nhất)
    salePriceCents: 3500000n, // 35.000 đ (giá ưu đãi gói thấp nhất)
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    isFeatured: true,
    isPublished: true,
    metadata: {
      badge: 'MUST-HAVE FOR CODERS',
      tag: 'HOT',
    },
    variants: [
      {
        name: 'Gói 1 ngày (400 requests / ngày)',
        sku: 'CRS-PRO-1D-400R',
        priceCents: 5500000n, // 55.000 đ
        salePriceCents: 3500000n, // 35.000 đ (-36%)
        durationDays: 1,
        position: 1,
        metadata: { discount: '-36%', requests: '400 requests / ngày', label: '1 ngày' },
      },
      {
        name: 'Gói 3 ngày (400 requests / ngày)',
        sku: 'CRS-PRO-3D-400R',
        priceCents: 11000000n, // 110.000 đ
        salePriceCents: 7000000n, // 70.000 đ (-36%)
        durationDays: 3,
        position: 2,
        metadata: { discount: '-36%', requests: '400 requests / ngày', label: '3 ngày' },
      },
      {
        name: 'Gói 7 ngày (400 requests / ngày)',
        sku: 'CRS-PRO-7D-400R',
        priceCents: 16000000n, // 160.000 đ
        salePriceCents: 10000000n, // 100.000 đ (-38%)
        durationDays: 7,
        position: 3,
        metadata: { discount: '-38%', requests: '400 requests / ngày', label: '7 ngày' },
      },
      {
        name: 'Gói 30 ngày (1300 requests / 30 ngày)',
        sku: 'CRS-PRO-30D-1300R',
        priceCents: 25000000n, // 250.000 đ
        salePriceCents: 15000000n, // 150.000 đ (-40%)
        durationDays: 30,
        position: 4,
        metadata: { discount: '-40%', requests: '1300 requests / 30 ngày', label: '30 ngày' },
      },
      {
        name: 'Gói 30 ngày (6500 requests / 30 ngày)',
        sku: 'CRS-PRO-30D-6500R',
        priceCents: 45000000n, // 450.000 đ
        salePriceCents: 27000000n, // 270.000 đ (-40%)
        durationDays: 30,
        position: 5,
        metadata: { discount: '-40%', requests: '6500 requests / 30 ngày', label: '30 ngày VIP' },
      },
    ],
  },
  {
    slug: 'claude-code',
    name: 'Claude Code',
    sku: 'CLD-CODE',
    categorySlug: 'ai-code',
    shortDescription: 'Tối ưu hóa dòng lệnh với mô hình Opus và Sonnet siêu mạnh mẽ',
    description:
      'Claude Code là CLI Terminal Agent từ Anthropic, cho phép lập trình viên chạy lệnh, đọc/sửa file, debug và build codebase trực tiếp trong terminal với sức mạnh của Claude 3.7 Sonnet và Opus.',
    priceCents: 4500000n, // 45.000 đ
    salePriceCents: 2000000n, // 20.000 đ
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    isFeatured: true,
    isPublished: true,
    metadata: {
      badge: 'CLI TERMINAL AGENT',
      tag: 'NEW',
    },
    variants: [
      {
        name: 'Hạn mức 10$ trong 30 ngày',
        sku: 'CLD-CODE-10USD-30D',
        priceCents: 4500000n, // 45.000 đ
        salePriceCents: 2000000n, // 20.000 đ (-56%)
        durationDays: 30,
        position: 1,
        metadata: { discount: '-56%', quotaUsd: 10, label: '10$ / 30 ngày' },
      },
      {
        name: 'Hạn mức 50$ trong 30 ngày',
        sku: 'CLD-CODE-50USD-30D',
        priceCents: 16000000n, // 160.000 đ
        salePriceCents: 8000000n, // 80.000 đ (-50%)
        durationDays: 30,
        position: 2,
        metadata: { discount: '-50%', quotaUsd: 50, label: '50$ / 30 ngày' },
      },
      {
        name: 'Hạn mức 500$ trong 30 ngày',
        sku: 'CLD-CODE-500USD-30D',
        priceCents: 130000000n, // 1.300.000 đ
        salePriceCents: 65000000n, // 650.000 đ (-50%)
        durationDays: 30,
        position: 3,
        metadata: { discount: '-50%', quotaUsd: 500, label: '500$ / 30 ngày' },
      },
    ],
  },
  {
    slug: 'codex-gpt',
    name: 'Codex GPT',
    sku: 'CDX-GPT',
    categorySlug: 'ai-code',
    shortDescription: 'Sử dụng các mô hình tiên tiến: GPT 5.4, 5.5, 5.6 (Sol, Terra, Luna)',
    description:
      'Codex GPT tích hợp mượt mà cho VS Code & macOS, hỗ trợ đầy đủ các model GPT thế hệ mới: GPT-5.4, GPT-5.5, GPT-5.6 (Sol, Terra, Luna) với tốc độ sinh mã cực nhanh và độ chính xác cao.',
    priceCents: 4500000n, // 45.000 đ
    salePriceCents: 2000000n, // 20.000 đ
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    isFeatured: true,
    isPublished: true,
    metadata: {
      badge: 'FOR VSCODE & MACOS',
      tag: 'HOT',
    },
    variants: [
      {
        name: 'Hạn mức 10$ trong 30 ngày',
        sku: 'CDX-GPT-10USD-30D',
        priceCents: 4500000n, // 45.000 đ
        salePriceCents: 2000000n, // 20.000 đ (-56%)
        durationDays: 30,
        position: 1,
        metadata: { discount: '-56%', quotaUsd: 10, label: '10$ / 30 ngày' },
      },
      {
        name: 'Hạn mức 20$ trong 30 ngày',
        sku: 'CDX-GPT-20USD-30D',
        priceCents: 7500000n, // 75.000 đ
        salePriceCents: 3500000n, // 35.000 đ (-53%)
        durationDays: 30,
        position: 2,
        metadata: { discount: '-53%', quotaUsd: 20, label: '20$ / 30 ngày' },
      },
      {
        name: 'Hạn mức 50$ trong 30 ngày',
        sku: 'CDX-GPT-50USD-30D',
        priceCents: 16000000n, // 160.000 đ
        salePriceCents: 8000000n, // 80.000 đ (-50%)
        durationDays: 30,
        position: 3,
        metadata: { discount: '-50%', quotaUsd: 50, label: '50$ / 30 ngày' },
      },
      {
        name: 'Hạn mức 100$ trong 30 ngày',
        sku: 'CDX-GPT-100USD-30D',
        priceCents: 30000000n, // 300.000 đ
        salePriceCents: 15000000n, // 150.000 đ (-50%)
        durationDays: 30,
        position: 4,
        metadata: { discount: '-50%', quotaUsd: 100, label: '100$ / 30 ngày' },
      },
      {
        name: 'Hạn mức 500$ trong 30 ngày',
        sku: 'CDX-GPT-500USD-30D',
        priceCents: 130000000n, // 1.300.000 đ
        salePriceCents: 65000000n, // 650.000 đ (-50%)
        durationDays: 30,
        position: 5,
        metadata: { discount: '-50%', quotaUsd: 500, label: '500$ / 30 ngày' },
      },
    ],
  },
]

async function main() {
  console.log('🚀 Bắt đầu cập nhật danh mục và sản phẩm...')

  // 1. Ensure category 'ai-code' exists
  const category = await db.category.upsert({
    where: { slug: 'ai-code' },
    update: {
      name: 'AI Code Tools',
      description: 'Cursor Pro, Claude Code, Codex GPT — Công cụ AI lập trình hàng đầu.',
      isActive: true,
    },
    create: {
      slug: 'ai-code',
      name: 'AI Code Tools',
      description: 'Cursor Pro, Claude Code, Codex GPT — Công cụ AI lập trình hàng đầu.',
      position: 1,
      isActive: true,
    },
  })

  console.log(`✅ Danh mục: ${category.name} (${category.id})`)

  // 2. Upsert each product and its variants
  for (const prodData of PRODUCTS_TO_SYNC) {
    const { variants, categorySlug, ...fields } = prodData

    const product = await db.product.upsert({
      where: { slug: fields.slug },
      update: {
        name: fields.name,
        sku: fields.sku,
        shortDescription: fields.shortDescription,
        description: fields.description,
        priceCents: fields.priceCents,
        salePriceCents: fields.salePriceCents,
        deliveryStrategy: fields.deliveryStrategy,
        isFeatured: fields.isFeatured,
        isPublished: fields.isPublished,
        metadata: fields.metadata,
        categoryId: category.id,
      },
      create: {
        ...fields,
        categoryId: category.id,
      },
    })

    console.log(`\n📦 Sản phẩm: [${product.slug}] ${product.name} (ID: ${product.id})`)

    // Upsert variants
    for (const v of variants) {
      const variant = await db.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          name: v.name,
          priceCents: v.priceCents,
          salePriceCents: v.salePriceCents,
          durationDays: v.durationDays,
          position: v.position,
          metadata: v.metadata,
          isActive: true,
          productId: product.id,
        },
        create: {
          productId: product.id,
          name: v.name,
          sku: v.sku,
          priceCents: v.priceCents,
          salePriceCents: v.salePriceCents,
          durationDays: v.durationDays,
          position: v.position,
          metadata: v.metadata,
          isActive: true,
        },
      })
      console.log(`   └─ Variant: [${variant.sku}] ${variant.name} -> Giá KM: ${Number(variant.salePriceCents || variant.priceCents) / 100} đ`)
    }
  }

  console.log('\n🎉 Hoàn thành cập nhật sản phẩm thành công!')
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
