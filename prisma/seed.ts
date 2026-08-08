/**
 * Seed data — Kandes.shop Phase 1.
 *
 * Tạo:
 *  - 1 super_admin user (admin@kandes.shop)
 *  - 1 customer demo (customer@example.com)
 *  - 5 categories (root level)
 *  - 10 products (kèm variants + media)
 *  - Default settings
 *
 * Chạy: `npm run prisma:seed`
 */

import { PrismaClient, DeliveryStrategy, StockStatus } from '@prisma/client'
import { hashPassword } from '../lib/password'
import { settingsService } from '../modules/settings/service'

const db = new PrismaClient()

const CATEGORIES = [
  {
    slug: 'ai-code',
    name: 'AI Code Tools',
    description: 'Cursor Pro, Windsurf, GitHub Copilot, JetBrains AI — công cụ AI coding hàng đầu.',
    position: 1,
  },
  {
    slug: 'ai-chat',
    name: 'AI Chat',
    description: 'ChatGPT Plus, Claude Pro, Gemini, Poe — trợ lý AI đàm thoại.',
    position: 2,
  },
  {
    slug: 'api-credits',
    name: 'API & Cloud Credits',
    description: 'OpenRouter, OpenAI, Anthropic, Together AI — credit cho developer.',
    position: 3,
  },
  {
    slug: 'design',
    name: 'Design Tools',
    description: 'Figma Pro, Midjourney, Adobe Creative Cloud — công cụ thiết kế.',
    position: 4,
  },
  {
    slug: 'software',
    name: 'Software Licenses',
    description: 'JetBrains All Products Pack, IDE premium plugins.',
    position: 5,
  },
]

const PRODUCTS = [
  {
    categorySlug: 'ai-code',
    slug: 'cursor-pro',
    name: 'Cursor Pro',
    sku: 'CRS-PRO',
    shortDescription: 'AI editor với Claude & GPT-4, 500 fast premium requests/tháng.',
    description:
      'Cursor Pro là IDE AI-native, tích hợp sâu Claude Sonnet/Opus và GPT-4. Tự động hoàn thành, edit đa file, agent mode. Phù hợp developer làm việc với codebase lớn.',
    priceCents: 24000000n, // 240.000 VND
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    variants: [
      { name: '1 tháng', priceCents: 24000000n, durationDays: 30, sku: 'CRS-PRO-1M' },
      { name: '1 năm', priceCents: 250000000n, durationDays: 365, sku: 'CRS-PRO-1Y' },
    ],
    isFeatured: true,
    avgRating: 4.8,
    reviewCount: 127,
  },
  {
    categorySlug: 'ai-code',
    slug: 'windsurf',
    name: 'Windsurf',
    sku: 'WND-PRO',
    shortDescription: 'AI IDE với Cascade flow, tự động multi-file edits.',
    description: 'Windsurf (by Codeium) — AI editor mạnh mẽ với Cascade agent flow. Tự động đọc hiểu toàn bộ codebase và đề xuất thay đổi.',
    priceCents: 19000000n,
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    variants: [
      { name: '1 tháng', priceCents: 19000000n, durationDays: 30, sku: 'WND-PRO-1M' },
      { name: '1 năm', priceCents: 200000000n, durationDays: 365, sku: 'WND-PRO-1Y' },
    ],
    isFeatured: true,
    avgRating: 4.6,
    reviewCount: 89,
  },
  {
    categorySlug: 'ai-code',
    slug: 'github-copilot-business',
    name: 'GitHub Copilot Business',
    sku: 'GHCP-BIZ',
    shortDescription: 'AI pair programmer cho team, 300 chat requests/tháng.',
    description: 'GitHub Copilot Business — hỗ trợ chat, code completion, pull request review. Hoàn toàn bảo mật cho doanh nghiệp.',
    priceCents: 22000000n,
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    variants: [
      { name: '1 tháng', priceCents: 22000000n, durationDays: 30, sku: 'GHCP-BIZ-1M' },
    ],
    isFeatured: false,
  },
  {
    categorySlug: 'ai-code',
    slug: 'jetbrains-ai-pro',
    name: 'JetBrains AI Pro',
    sku: 'JBAI-PRO',
    shortDescription: 'AI assistant cho toàn bộ IDE JetBrains (IntelliJ, PyCharm...).',
    description: 'JetBrains AI Pro — tích hợp sâu với IntelliJ IDEA, PyCharm, WebStorm, GoLand... Hỗ trợ chat, code completion, refactoring.',
    priceCents: 18000000n,
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    variants: [
      { name: '1 tháng', priceCents: 18000000n, durationDays: 30, sku: 'JBAI-PRO-1M' },
    ],
    isFeatured: false,
  },
  {
    categorySlug: 'ai-chat',
    slug: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    sku: 'CGP-PLUS',
    shortDescription: 'GPT-4o, GPT-4.1, DALL-E, Advanced Data Analysis.',
    description: 'ChatGPT Plus — truy cập GPT-4o, GPT-4.1, image generation với DALL-E 3, phân tích dữ liệu nâng cao. Tốc độ nhanh, ưu tiên server.',
    priceCents: 23000000n,
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    variants: [
      { name: '1 tháng', priceCents: 23000000n, durationDays: 30, sku: 'CGP-PLUS-1M' },
      { name: '1 năm', priceCents: 230000000n, durationDays: 365, sku: 'CGP-PLUS-1Y' },
    ],
    isFeatured: true,
    avgRating: 4.9,
    reviewCount: 203,
  },
  {
    categorySlug: 'ai-chat',
    slug: 'claude-pro',
    name: 'Claude Pro',
    sku: 'CLA-PRO',
    shortDescription: 'Claude Sonnet 4.5, Opus 4 — vượt trội cho coding & writing.',
    description: 'Claude Pro — truy cập Claude Sonnet 4.5, Opus 4, công cụ Projects, Artifacts. Đặc biệt mạnh cho coding, phân tích tài liệu dài.',
    priceCents: 23000000n,
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    variants: [
      { name: '1 tháng', priceCents: 23000000n, durationDays: 30, sku: 'CLA-PRO-1M' },
    ],
    isFeatured: true,
  },
  {
    categorySlug: 'ai-chat',
    slug: 'gemini-advanced',
    name: 'Gemini Advanced',
    sku: 'GEM-ADV',
    shortDescription: 'Gemini 2.5 Pro + 2 TB Google One storage.',
    description: 'Gemini Advanced — truy cập Gemini 2.5 Pro, Deep Research, Veo video gen, 2TB Google One storage.',
    priceCents: 25000000n,
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    variants: [
      { name: '1 tháng', priceCents: 25000000n, durationDays: 30, sku: 'GEM-ADV-1M' },
    ],
    isFeatured: false,
  },
  {
    categorySlug: 'api-credits',
    slug: 'openrouter-credits',
    name: 'OpenRouter Credits $10',
    sku: 'OR-CR-10',
    shortDescription: 'Universal API gateway — truy cập Claude, GPT, Gemini qua 1 key.',
    description: 'OpenRouter — universal API cho 100+ model AI (Claude, GPT-4o, Gemini, Llama, Mistral...). Một endpoint, một key, nhiều model.',
    priceCents: 26000000n, // ~$10 USD
    deliveryStrategy: DeliveryStrategy.MANUAL_KEY,
    variants: [
      { name: '$10 credits', priceCents: 26000000n, sku: 'OR-CR-10' },
      { name: '$25 credits', priceCents: 62000000n, sku: 'OR-CR-25' },
      { name: '$50 credits', priceCents: 120000000n, sku: 'OR-CR-50' },
    ],
    isFeatured: true,
  },
  {
    categorySlug: 'design',
    slug: 'figma-pro',
    name: 'Figma Pro',
    sku: 'FGM-PRO',
    shortDescription: 'Figma Professional — unlimited files, advanced dev mode.',
    description: 'Figma Pro — unlimited design files, FigJam, advanced prototyping, dev mode. Cho cá nhân và team nhỏ.',
    priceCents: 13000000n,
    deliveryStrategy: DeliveryStrategy.MANUAL_KEY,
    variants: [
      { name: '1 tháng', priceCents: 13000000n, durationDays: 30, sku: 'FGM-PRO-1M' },
    ],
    isFeatured: false,
  },
  {
    categorySlug: 'software',
    slug: 'jetbrains-all-products',
    name: 'JetBrains All Products Pack',
    sku: 'JB-ALL',
    shortDescription: 'Tất cả IDE JetBrains + plugin — IntelliJ, PyCharm, WebStorm, ...',
    description: 'JetBrains All Products Pack — bao gồm IntelliJ IDEA Ultimate, PyCharm Professional, WebStorm, GoLand, CLion, RubyMine, PhpStorm, Rider, DataGrip và hơn 10 IDE khác.',
    priceCents: 24000000n,
    deliveryStrategy: DeliveryStrategy.INSTANT_AUTO,
    variants: [
      { name: '1 năm (cá nhân)', priceCents: 240000000n, durationDays: 365, sku: 'JB-ALL-1Y' },
    ],
    isFeatured: true,
  },
] as const

async function main() {
  console.log('🌱 Bắt đầu seed...')

  // 1. Admin user
  const adminEmail = 'admin@kandes.shop'
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } })
  if (existingAdmin) {
    console.log(`   ↻ Admin user đã tồn tại (${adminEmail})`)
  } else {
    const adminHash = await hashPassword('Admin@123')
    await db.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminHash,
        name: 'Kandes Admin',
        role: 'super_admin',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    })
    console.log(`   ✓ Tạo admin user: ${adminEmail} / Admin@123`)
  }

  // 2. Customer demo
  const customerEmail = 'customer@example.com'
  const existingCustomer = await db.user.findUnique({ where: { email: customerEmail } })
  if (existingCustomer) {
    console.log(`   ↻ Customer user đã tồn tại (${customerEmail})`)
  } else {
    const customerHash = await hashPassword('Customer@123')
    await db.user.create({
      data: {
        email: customerEmail,
        passwordHash: customerHash,
        name: 'Demo Customer',
        role: 'customer',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    })
    console.log(`   ✓ Tạo customer user: ${customerEmail} / Customer@123`)
  }

  // 3. Categories
  console.log('\n📂 Categories:')
  const categoryMap = new Map<string, string>()
  for (const cat of CATEGORIES) {
    const existing = await db.category.findUnique({ where: { slug: cat.slug } })
    if (existing) {
      categoryMap.set(cat.slug, existing.id)
      console.log(`   ↻ ${cat.name} (đã tồn tại)`)
      continue
    }
    const created = await db.category.create({
      data: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        position: cat.position,
        isActive: true,
      },
    })
    categoryMap.set(cat.slug, created.id)
    console.log(`   ✓ ${cat.name}`)
  }

  // 4. Products
  console.log('\n📦 Products:')
  for (const product of PRODUCTS) {
    const categoryId = categoryMap.get(product.categorySlug)
    if (!categoryId) throw new Error(`Category không tìm thấy: ${product.categorySlug}`)

    const existing = await db.product.findUnique({ where: { slug: product.slug } })
    if (existing) {
      console.log(`   ↻ ${product.name} (đã tồn tại)`)
      continue
    }

    await db.product.create({
      data: {
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        priceCents: product.priceCents,
        currency: 'VND',
        deliveryStrategy: product.deliveryStrategy,
        stockStatus: StockStatus.in_stock,
        isPublished: true,
        isFeatured: product.isFeatured,
        avgRating: 'avgRating' in product ? product.avgRating : 0,
        reviewCount: 'reviewCount' in product ? product.reviewCount : 0,
        categoryId,
        variants: {
          create: product.variants.map((v, idx) => ({
            name: v.name,
            sku: v.sku,
            priceCents: v.priceCents,
            durationDays: 'durationDays' in v ? v.durationDays : null,
            position: idx,
            isActive: true,
          })),
        },
      },
    })
    console.log(`   ✓ ${product.name} (${product.variants.length} variants)`)
  }

  // 5. Settings mặc định — dùng modules/settings/service.seedDefaults() để
  // đồng bộ với registry (P4-06). Idempotent.
  console.log('\n⚙️  Settings:')
  const seedResult = await settingsService.seedDefaults()
  console.log(
    `   ✓ Inserted ${seedResult.inserted} settings, skipped ${seedResult.skipped} existing`
  )
  if (seedResult.byCategory) {
    for (const [cat, count] of Object.entries(seedResult.byCategory)) {
      console.log(`     · ${cat}: ${count}`)
    }
  }

  // 6. AI plans (P6-01) — call module seed function for testability.
  console.log('\n🤖 AI plans:')
  const { seedAiPlans } = await import('./seeds/ai-plans')
  // The seeds/ai-plans.ts main() prints its own log block; we wrap to share prefix.
  // To keep it simple here, we just delegate.
  await seedAiPlans().catch((e: unknown) => {
    console.error('AI plans seed failed:', e)
  })

  console.log('\n✅ Seed hoàn tất!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
