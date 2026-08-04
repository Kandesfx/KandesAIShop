/**
 * Seed AI plans — Phase 6 P6-01.
 *
 * Idempotent: chạy lại nhiều lần an toàn (dùng upsert theo slug).
 *
 * Plans:
 *  - starter  — 100K tokens, 60 req/min, 30 days
 *  - pro      — 1M tokens, 300 req/min, 30 days
 *  - business — 10M tokens, 1000 req/min, 90 days
 *
 * Chạy: `tsx prisma/seeds/ai-plans.ts` (hoặc tự động qua `npm run prisma:seed` sau khi
 * thêm vào prisma/seed.ts — Phase 6 làm điều đó).
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const PLANS = [
  {
    slug: 'starter',
    name: 'AI Starter',
    description:
      'Gói dùng thử — 100K tokens, phù hợp test hoặc dùng nhẹ hàng tháng.',
    priceCents: 99000n,
    durationDays: 30,
    quotaTokens: 100_000n,
    rateLimitPerMinute: 60,
    softCapTokens: 100_000n,
  },
  {
    slug: 'pro',
    name: 'AI Pro',
    description:
      'Gói cho developer — 1M tokens, tốc độ cao, dùng cho dự án thường ngày.',
    priceCents: 499000n,
    durationDays: 30,
    quotaTokens: 1_000_000n,
    rateLimitPerMinute: 300,
    softCapTokens: 1_000_000n,
  },
  {
    slug: 'business',
    name: 'AI Business',
    description:
      'Gói doanh nghiệp — 10M tokens, không giới hạn rate, dùng cho team và production.',
    priceCents: 2499000n,
    durationDays: 90,
    quotaTokens: 10_000_000n,
    rateLimitPerMinute: 1000,
    softCapTokens: 10_000_000n,
  },
] as const

export async function seedAiPlans(): Promise<void> {
  console.log('🌱 Seeding AI plans...')
  for (const p of PLANS) {
    const existing = await db.aiPlan.findUnique({ where: { slug: p.slug } })
    if (existing) {
      console.log(`   ↻ ${p.name} (đã tồn tại)`)
      continue
    }
    await db.aiPlan.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        durationDays: p.durationDays,
        quotaTokens: p.quotaTokens,
        rateLimitPerMinute: p.rateLimitPerMinute,
        softCapTokens: p.softCapTokens,
        isActive: true,
      },
    })
    console.log(`   ✓ ${p.name}`)
  }
  console.log('✅ AI plans seeded')
}

async function main(): Promise<void> {
  await seedAiPlans()
}

main()
  .catch((e) => {
    console.error('❌ AI plan seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })