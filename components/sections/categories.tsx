import Link from 'next/link'
import { Code2, Sparkles, Cloud, Palette, Wrench, ArrowUpRight, ArrowRight } from 'lucide-react'
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

const GLOW_MAP: Record<string, string> = {
  'ai-code': 'bg-electric/10',
  'ai-chat': 'bg-electric/10',
  'api-credits': 'bg-plasma/10',
  design: 'bg-warning/10',
  software: 'bg-ink-400/30',
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
          glow: GLOW_MAP[c.slug] ?? 'bg-electric/10',
        }))
      : Object.keys(ICON_MAP).map((slug, idx) => ({
          slug,
          code: String(idx + 1).padStart(2, '0'),
          name: slug,
          desc: DEFAULT_DESC_MAP[slug] ?? '',
          count: 0,
          icon: ICON_MAP[slug] ?? Code2,
          accent: ACCENT_MAP[slug] ?? 'text-electric',
          glow: GLOW_MAP[slug] ?? 'bg-electric/10',
        }))

  return (
    <section className="relative py-24 lg:py-32 bg-ink-900">
      <div className="container-narrow">
        {/* Section header */}
        <div className="flex items-end justify-between gap-6 mb-12 pb-6 border-b border-ink-400">
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
              [ 03 / DANH MỤC ]
            </span>
            <h2 className="text-display-lg font-display">
              {items.length} nhóm sản phẩm,
              <br />
              <span className="text-gradient-electric">một cửa hàng.</span>
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-2 group px-4 py-2 border border-ink-300 hover:border-electric text-[13px] font-mono uppercase tracking-[0.14em] text-ink-100 hover:text-electric transition-all"
          >
            Tất cả
            <ArrowRight size={14} strokeWidth={1.5} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-400 border border-ink-400">
          {items.map((cat, idx) => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group bg-ink-800 p-6 transition-all duration-200 hover:bg-ink-700 relative min-h-[180px] flex flex-col animate-slide-in-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  {/* Icon with glow background circle */}
                  <span className="relative mb-6">
                    <span className={`absolute -inset-2 rounded-full ${cat.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm`} aria-hidden />
                    <span className={`relative ${cat.accent} transition-transform duration-300 group-hover:scale-110 block`}>
                      <Icon size={28} strokeWidth={1.5} />
                    </span>
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-200 group-hover:text-electric transition-colors">
                    /{cat.code}
                  </span>
                </div>

                <div className="mt-auto space-y-2">
                  <h3 className="text-[18px] font-display font-semibold text-ink-50 group-hover:text-electric transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[13px] text-ink-100 leading-relaxed mono line-clamp-2">
                    {cat.desc}
                  </p>
                  {/* Count badge — styled better */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.1em] border border-ink-300 text-ink-200 group-hover:border-electric/40 group-hover:text-electric transition-colors">
                      {cat.count} sản phẩm
                    </span>
                  </div>
                </div>

                {/* Hover arrow — animated slide */}
                <span className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 text-electric">
                  <ArrowUpRight size={16} strokeWidth={1.5} />
                </span>
              </Link>
            )
          })}

          {/* CTA tile */}
          <Link
            href="/products"
            className="group bg-electric text-ink-900 p-6 transition-all duration-200 hover:bg-electric-hover relative flex flex-col justify-between min-h-[180px] overflow-hidden animate-slide-in-up"
            style={{ animationDelay: `${items.length * 80}ms` }}
          >
            {/* Shine overlay on CTA tile */}
            <div className="shine-overlay absolute inset-0 z-10" aria-hidden />
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-900/70">
              /{String(items.length + 1).padStart(2, '0')}
            </div>
            <div>
              <div className="text-[18px] font-display font-semibold mb-1 flex items-center gap-2">
                Xem tất cả
                <ArrowRight size={18} strokeWidth={2} className="transition-transform group-hover:translate-x-1.5" />
              </div>
              <div className="text-[13px] mono text-ink-900/80">Tất cả sản phẩm</div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
