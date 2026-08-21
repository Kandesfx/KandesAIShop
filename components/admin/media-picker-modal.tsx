'use client'

import { useState } from 'react'
import { X, Search, Image as ImageIcon, Link as LinkIcon, Check, Sparkles } from 'lucide-react'
import { PRESET_PRODUCT_IMAGES, type PresetImage } from '@/lib/preset-media'

interface MediaPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (image: { url: string; altText: string }) => void
  currentUrl?: string
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentUrl,
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [customUrl, setCustomUrl] = useState('')
  const [customAlt, setCustomAlt] = useState('')

  if (!isOpen) return null

  const filteredPresets = PRESET_PRODUCT_IMAGES.filter((img) => {
    const matchSearch =
      search === '' ||
      img.title.toLowerCase().includes(search.toLowerCase()) ||
      img.description?.toLowerCase().includes(search.toLowerCase()) ||
      img.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === 'all' || img.category === selectedCategory
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

  const handleSelectPreset = (preset: PresetImage) => {
    onSelect({
      url: preset.url,
      altText: preset.altText,
    })
    onClose()
  }

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customUrl.trim()) return
    onSelect({
      url: customUrl.trim(),
      altText: customAlt.trim() || 'Product Image',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-ink-800 border border-ink-400 flex flex-col shadow-2xl overflow-hidden"
        style={{
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.15)',
        }}
      >
        {/* Top glow bar */}
        <div className="h-1 bg-gradient-to-r from-electric via-plasma to-electric w-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-400 bg-ink-900">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
              [ KHO ẢNH HỆ THỐNG · MEDIA GALLERY ]
            </span>
            <h2 className="text-[18px] font-display font-bold text-ink-50">
              Chọn Ảnh Cho Sản Phẩm
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-200 hover:text-ink-50 hover:bg-ink-700/60 rounded transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-ink-400 bg-ink-900/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-mono uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'presets'
                ? 'border-electric text-electric bg-electric/5'
                : 'border-transparent text-ink-200 hover:text-ink-100'
            }`}
          >
            <Sparkles size={14} /> Kho Ảnh AI Bản Quyền ({PRESET_PRODUCT_IMAGES.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-mono uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'custom'
                ? 'border-electric text-electric bg-electric/5'
                : 'border-transparent text-ink-200 hover:text-ink-100'
            }`}
          >
            <LinkIcon size={14} /> Nhập URL Ảnh Ngoài / CDN
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[calc(90vh-180px)]">
          {activeTab === 'presets' ? (
            <div className="space-y-5">
              {/* Search & Category Pills */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-200"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên công cụ (Cursor, Claude, GPT, Copilot...)..."
                    className="w-full pl-9 pr-3 py-2 bg-ink-900 border border-ink-400 text-[13px] text-ink-50 focus:border-electric focus:outline-none"
                  />
                </div>
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                      selectedCategory === c.id
                        ? 'bg-electric text-ink-900 font-bold'
                        : 'bg-ink-900 border border-ink-400 text-ink-200 hover:text-ink-100 hover:border-ink-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPresets.map((preset) => {
                  const isSelected = currentUrl === preset.url
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`group cursor-pointer border transition-all duration-200 bg-ink-900 relative flex flex-col overflow-hidden ${
                        isSelected
                          ? 'border-electric ring-1 ring-electric'
                          : 'border-ink-400 hover:border-electric/60 hover:bg-ink-700/50'
                      }`}
                    >
                      {/* Image Preview */}
                      <div className="aspect-[4/3] w-full bg-ink-950 flex items-center justify-center relative overflow-hidden border-b border-ink-400/80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preset.url}
                          alt={preset.altText}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {preset.badgeText && (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[8px] font-mono font-bold bg-ink-900/90 border border-electric/40 text-electric uppercase">
                            {preset.badgeText}
                          </span>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-electric rounded-full flex items-center justify-center text-ink-900">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="text-[13px] font-display font-semibold text-ink-50 group-hover:text-electric transition-colors">
                            {preset.title}
                          </div>
                          <div className="text-[10px] font-mono text-ink-200 truncate mt-0.5">
                            {preset.url}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`w-full py-1.5 text-[11px] font-mono uppercase tracking-wider transition-colors ${
                            isSelected
                              ? 'bg-electric/20 text-electric border border-electric'
                              : 'bg-ink-800 hover:bg-electric hover:text-ink-900 text-ink-100 border border-ink-400'
                          }`}
                        >
                          {isSelected ? '✓ ĐANG SỬ DỤNG' : 'CHỌN ẢNH NÀY'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredPresets.length === 0 && (
                <div className="py-12 text-center text-ink-200 font-mono text-[13px]">
                  Không tìm thấy hình ảnh phù hợp với từ khóa &ldquo;{search}&rdquo;
                </div>
              )}
            </div>
          ) : (
            /* Custom URL Tab */
            <form onSubmit={handleApplyCustom} className="space-y-6 max-w-xl mx-auto py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 mb-1.5">
                    ĐƯỜNG DẪN HÌNH ẢNH (URL / CDN LINK) *
                  </label>
                  <input
                    type="url"
                    required
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/images/my-product-banner.png"
                    className="w-full px-3.5 py-2.5 bg-ink-900 border border-ink-400 text-[13px] text-ink-50 focus:border-electric focus:outline-none font-mono"
                  />
                  <span className="text-[11px] text-ink-200 mt-1 block">
                    Hỗ trợ định dạng: PNG, JPG, WEBP, SVG
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 mb-1.5">
                    MÔ TẢ ẢNH (ALT TEXT)
                  </label>
                  <input
                    type="text"
                    value={customAlt}
                    onChange={(e) => setCustomAlt(e.target.value)}
                    placeholder="vd: Cursor Pro 1 Tháng Bản Quyền"
                    className="w-full px-3.5 py-2.5 bg-ink-900 border border-ink-400 text-[13px] text-ink-50 focus:border-electric focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Preview of custom URL */}
              {customUrl && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase text-ink-200">
                    XEM TRƯỚC HÌNH ẢNH:
                  </div>
                  <div className="w-full aspect-[16/9] bg-ink-950 border border-ink-400 flex items-center justify-center overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={customUrl}
                      alt={customAlt || 'Preview'}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-ink-400">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-[12px] font-mono uppercase text-ink-200 hover:text-ink-50"
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  disabled={!customUrl.trim()}
                  className="px-6 py-2 bg-electric text-ink-900 font-display font-bold text-[13px] uppercase hover:bg-electric-hover disabled:opacity-50"
                >
                  ÁP DỤNG HÌNH ẢNH
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-ink-400 bg-ink-900 text-right">
          <span className="text-[11px] font-mono text-ink-200">
            Kandes Media Manager &bull; Hệ thống tự động tối ưu hóa hiển thị trên mọi thiết bị
          </span>
        </div>
      </div>
    </div>
  )
}
