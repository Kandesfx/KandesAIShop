'use client'

import { useState } from 'react'
import { Sparkles, Copy, Check, Search, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { PRESET_PRODUCT_IMAGES, type PresetImage } from '@/lib/preset-media'

export default function AdminMediaPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const filtered = PRESET_PRODUCT_IMAGES.filter((img) => {
    const matchSearch =
      search === '' ||
      img.title.toLowerCase().includes(search.toLowerCase()) ||
      img.description?.toLowerCase().includes(search.toLowerCase()) ||
      img.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'all' || img.category === category
    return matchSearch && matchCat
  })

  const categories = [
    { id: 'all', label: 'TẤT CẢ' },
    { id: 'cursor', label: 'CURSOR' },
    { id: 'claude', label: 'CLAUDE' },
    { id: 'openai', label: 'OPENAI / CODEX' },
    { id: 'copilot', label: 'COPILOT' },
    { id: 'windsurf', label: 'WINDSURF' },
    { id: 'jetbrains', label: 'JETBRAINS' },
    { id: 'deepseek', label: 'DEEPSEEK' },
    { id: 'gateway', label: 'GATEWAY' },
  ]

  return (
    <div className="container-narrow py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-400 pb-6">
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
            [ ADMIN / 02B / MEDIA LIBRARY ]
          </span>
          <h1 className="text-h1 font-display">Kho Ảnh &amp; Media Hệ Thống</h1>
          <p className="text-body text-ink-100 text-[13px] max-w-2xl">
            Tập hợp các tài nguyên hình ảnh, vector SVG bản quyền được tối ưu hóa hiển thị cho sản phẩm AI Coding Tools trên website Kandes.shop.
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-ink-800 p-4 border border-ink-400 rounded">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-200" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm hình ảnh theo từ khóa..."
            className="w-full pl-9 pr-3 py-2 bg-ink-900 border border-ink-400 text-[13px] text-ink-50 rounded focus:border-electric focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
                category === c.id
                  ? 'bg-electric text-ink-900 font-bold shadow'
                  : 'bg-ink-900 border border-ink-400 text-ink-200 hover:text-ink-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((item) => {
          const isCopied = copiedId === item.id

          return (
            <div
              key={item.id}
              className="bg-ink-800 border border-ink-400 rounded overflow-hidden flex flex-col group hover:border-electric/70 transition-all"
            >
              {/* Media Preview */}
              <div className="aspect-[4/3] bg-ink-950 flex items-center justify-center relative overflow-hidden border-b border-ink-400">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.altText}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {item.badgeText && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-mono font-bold bg-ink-900/90 border border-electric/40 text-electric uppercase rounded">
                    {item.badgeText}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-[15px] font-display font-semibold text-ink-50 group-hover:text-electric transition-colors">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-[12px] text-ink-200 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-2 text-[10px] font-mono text-ink-200 bg-ink-900 px-2 py-1 rounded truncate border border-ink-400/50">
                    {item.url}
                  </div>
                </div>

                <div className="pt-2 border-t border-ink-400/50 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(item.url, item.id)}
                    className={`flex-1 py-1.5 px-3 text-[11px] font-mono uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors ${
                      isCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-ink-900 hover:bg-electric hover:text-ink-900 text-ink-100 border border-ink-400'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} /> ĐÃ SAO CHÉP
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> SAO CHÉP LINK
                      </>
                    )}
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-ink-900 hover:bg-ink-700 text-ink-200 hover:text-ink-50 border border-ink-400 rounded flex items-center justify-center"
                    title="Mở trong tab mới"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
