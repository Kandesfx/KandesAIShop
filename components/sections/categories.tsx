import Link from 'next/link'
import { Code2, Sparkles, Cloud, Palette, Wrench, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  'ai-code': Code2,
  'ai-chat': Sparkles,
  'api-credits': Cloud,
  design: Palette,
  software: Wrench,
}

const ACCENT_MAP: Record<string, string> = {
  'ai-code': 'text-electric',
  'ai-chat': 'text-electric',
  'api-credits': 'text-plasma-hover',
  design: 'text-warning',
  software: 'text-ink-100',
}

const DEFAULT_DESC_MAP: Record<string, string> = {
  'ai-code': 'Cursor Pro · Windsurf · GitHub Copilot · JetBrains AI',
  'ai-chat': 'ChatGPT Plus · Claude Pro · Gemini · Poe',
  'api-credits': 'OpenRouter · OpenAI · Anthropic · Together AI',
  design: 'Figma Pro · Midjourney · Adobe Creative Cloud',
  software: 'JetBrains All Products · IDE premium plugins',
}

interface CategoryDisplay {
  id: string
  slug: string
  name: string
  description?: string | null
  _count?: { products: number }
}

interface CategoriesProps {
  categories: CategoryDisplay[]
}

export function Categories({ categories }: CategoriesProps) {
  // Fallback nếu chưa có data từ DB
  const items =
    categories.length > 0
      ? categories.slice(0, 5).map((c, idx) => ({
          slug: c.slug,
          code: String(idx + 1).padStart(2, '0'),
          name: c.name,
          desc: c.description ?? DEFAULT_DESC_MAP[c.slug] ?? '',
          count: c._count?.products ?? 0,
          icon: ICON_MAP[c.slug] ?? Code2,
          accent: ACCENT_MAP[c.slug] ?? 'text-electric',
        }))
      : Object.keys(ICON_MAP).map((slug, idx) => ({
          slug,
          code: String(idx + 1).padStart(2, '0'),
          name: slug,
          desc: DEFAULT_DESC_MAP[slug] ?? '',
          count: 0,
          icon: ICON_MAP[slug] ?? Code2,
          accent: ACCENT_MAP[slug] ?? 'text-electric',
        }))

  return (
    <section className="relative py-24 lg:py-32 bg-ink-900">
      <div className="container-narrow">
        {/* Section header */}
        <div className="flex items-end justify-between gap-6 mb-12 pb-6 border-b border-ink-400">
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
              [ 02 / DANH MỤC ]
            </span>
            <h2 className="text-display-lg font-display">
              {items.length} nhóm sản phẩm,
              <br />
              <span className="text-electric">một cửa hàng.</span>
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.14em] text-ink-100 hover:text-electric transition-colors"
          >
            Tất cả
            <ArrowUpRight size={14} strokeWidth={1.5} />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-400 border border-ink-400">
          {items.map((cat) => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group bg-ink-800 p-6 transition-colors hover:bg-ink-700 relative min-h-[180px] flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className={`mb-6 ${cat.accent}`}>
                    <Icon size={28} strokeWidth={1.5} />
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-200 group-hover:text-electric transition-colors">
                    /{cat.code}
                  </span>
                </div>

                <div className="mt-auto space-y-2">
                  <h3 className="text-[18px] font-display font-semibold text-ink-50 group-hover:text-electric transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[12px] text-ink-100 leading-relaxed mono line-clamp-2">
                    {cat.desc}
                  </p>
                  <p className="text-[10px] font-mono text-ink-200 pt-1">
                    {cat.count} sản phẩm
                  </p>
                </div>

                <span className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-electric">
                  <ArrowUpRight size={16} strokeWidth={1.5} />
                </span>
              </Link>
            )
          })}

          {/* CTA tile */}
          <Link
            href="/products"
            className="group bg-electric text-ink-900 p-6 transition-colors hover:bg-electric-hover relative flex flex-col justify-between min-h-[180px]"
          >
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-900/70">
              /06
            </div>
            <div>
              <div className="text-[18px] font-display font-semibold mb-1">Xem tất cả →</div>
              <div className="text-[12px] mono text-ink-900/80">Tất cả sản phẩm</div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
