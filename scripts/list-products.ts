import { db } from '../lib/db'

async function main() {
  const products = await db.product.findMany({
    include: {
      category: true,
      variants: true,
    },
  })

  console.log(`Found ${products.length} products:`)
  for (const p of products) {
    console.log(`\n- [${p.slug}] ${p.name} (Category: ${p.category.name})`)
    console.log(`  Price: ${Number(p.priceCents) / 100} VND, Sale: ${p.salePriceCents ? Number(p.salePriceCents) / 100 : 'none'}`)
    console.log(`  Variants: ${p.variants.length}`)
    for (const v of p.variants) {
      console.log(`    * [${v.sku}] ${v.name}: ${Number(v.priceCents) / 100} VND (Sale: ${v.salePriceCents ? Number(v.salePriceCents) / 100 : 'none'}), Duration: ${v.durationDays}d`)
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect())
