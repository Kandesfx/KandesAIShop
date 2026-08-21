'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X,
  Search,
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Link as LinkIcon,
  Check,
  Sparkles,
  Loader2,
  Trash2,
  RefreshCw,
  FolderOpen,
} from 'lucide-react'
import { PRESET_PRODUCT_IMAGES, type PresetImage } from '@/lib/preset-media'
import { api } from '@/lib/api-client'

interface MediaPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (image: { url: string; altText: string }) => void
  currentUrl?: string
}

interface R2File {
  key: string
  url: string
  size: number
  lastModified?: string
  filename: string
  fileType: 'image' | 'video' | 'audio' | 'document' | 'other'
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentUrl,
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'r2_gallery' | 'presets' | 'custom'>('upload')
  const [r2Files, setR2Files] = useState<R2File[]>([])
  const [loadingR2, setLoadingR2] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [isDragging, setIsDragging] = useState(false)

  const [customUrl, setCustomUrl] = useState('')
  const [customAlt, setCustomAlt] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load R2 files when modal opens or tab switches
  useEffect(() => {
    if (isOpen && (activeTab === 'r2_gallery' || activeTab === 'upload')) {
      fetchR2Files()
    }
  }, [isOpen, activeTab])

  const fetchR2Files = async () => {
    setLoadingR2(true)
    try {
      const res = await api.get<{ files: R2File[] }>('/api/admin/media?limit=100')
      setR2Files(res.files || [])
    } catch (e) {
      console.error('Lỗi tải danh sách R2:', e)
    } finally {
      setLoadingR2(false)
    }
  }

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append('files', file)
      })

      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const rawText = await res.text()
      let resJson: { ok?: boolean; success?: boolean; error?: { message?: string } | string; message?: string; data?: { files?: R2File[] }; files?: R2File[] } | null = null

      try {
        resJson = JSON.parse(rawText)
      } catch {
        throw new Error(
          res.status === 413
            ? 'Dung lượng tệp quá lớn vượt giới hạn cho phép.'
            : `Máy chủ phản hồi không hợp lệ (${res.status} ${res.statusText || 'Error'}). Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.`
        )
      }

      if (!res.ok || (resJson && resJson.ok === false && !resJson.success)) {
        const errMsg =
          (typeof resJson?.error === 'object' ? resJson?.error?.message : resJson?.error) ||
          resJson?.message ||
          'Tải tệp lên thất bại'
        throw new Error(errMsg)
      }

      const payload = resJson?.data || resJson
      const uploadedFiles: R2File[] = payload?.files || []

      // Refresh list
      await fetchR2Files()

      // If single image uploaded, automatically select it
      if (uploadedFiles.length === 1) {
        const first = uploadedFiles[0]!
        onSelect({
          url: first.url,
          altText: first.filename.replace(/\.[^/.]+$/, ''),
        })
        onClose()
      } else {
        setActiveTab('r2_gallery')
      }
    } catch (e) {
      setUploadError((e as Error).message || 'Lỗi khi tải tệp lên R2')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  const filteredR2 = r2Files.filter((f) => {
    const matchSearch = search === '' || f.filename.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || f.fileType === filterType
    return matchSearch && matchType
  })

  const filteredPresets = PRESET_PRODUCT_IMAGES.filter((img) => {
    return search === '' || img.title.toLowerCase().includes(search.toLowerCase()) || img.category.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-ink-800 border border-ink-400 flex flex-col shadow-2xl overflow-hidden rounded"
        style={{
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.15)',
        }}
      >
        {/* Top glow line */}
        <div className="h-1 bg-gradient-to-r from-electric via-plasma to-sunset w-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-400 bg-ink-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-electric/10 border border-electric/30 rounded text-electric">
              <FolderOpen size={20} />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
                [ CLOUDFLARE R2 · MEDIA STORAGE MANAGER ]
              </span>
              <h2 className="text-[18px] font-display font-bold text-ink-50">
                Kho Tệp Tin &amp; Chọn Ảnh Sản Phẩm
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-100 hover:text-ink-50 hover:bg-ink-700/60 rounded transition-colors"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-ink-400 bg-ink-900/60 px-6 pt-2 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-electric text-electric bg-electric/5'
                : 'border-transparent text-ink-100 hover:text-ink-100'
            }`}
          >
            <Upload size={14} /> Tải Tệp Lên R2
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('r2_gallery')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'r2_gallery'
                ? 'border-electric text-electric bg-electric/5'
                : 'border-transparent text-ink-100 hover:text-ink-100'
            }`}
          >
            <ImageIcon size={14} /> Kho R2 Đã Tải Lên ({r2Files.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'presets'
                ? 'border-electric text-electric bg-electric/5'
                : 'border-transparent text-ink-100 hover:text-ink-100'
            }`}
          >
            <Sparkles size={14} /> Ảnh AI Mẫu ({PRESET_PRODUCT_IMAGES.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'custom'
                ? 'border-electric text-electric bg-electric/5'
                : 'border-transparent text-ink-100 hover:text-ink-100'
            }`}
          >
            <LinkIcon size={14} /> Nhập Link URL Ngoài
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[calc(90vh-180px)]">
          {/* TAB 1: UPLOAD TO R2 */}
          {activeTab === 'upload' && (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,.zip,.rar,.txt"
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files)
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-electric bg-electric/10 scale-[1.01]'
                    : 'border-ink-400 bg-ink-900/60 hover:bg-ink-900 hover:border-electric/70'
                }`}
              >
                {uploading ? (
                  <div className="space-y-4">
                    <Loader2 size={48} className="mx-auto text-electric animate-spin" />
                    <div className="space-y-1">
                      <div className="text-[15px] font-display font-semibold text-ink-50">
                        ĐANG TẢI TỆP TIN LÊN CLOUDFLARE R2...
                      </div>
                      <div className="text-[13px] font-mono text-ink-100">
                        Tệp đang được lưu trữ an toàn &amp; phân phối qua CDN
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-electric/10 border border-electric/30 rounded-full flex items-center justify-center text-electric">
                      <Upload size={30} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[16px] font-display font-bold text-ink-50">
                        Kéo thả hình ảnh, video hoặc tài liệu vào đây
                      </div>
                      <div className="text-[13px] text-ink-100">
                        hoặc <span className="text-electric font-semibold underline">bấm vào đây</span> để chọn file từ máy tính / điện thoại
                      </div>
                    </div>
                    <div className="pt-2 text-[12px] font-mono text-ink-100 border-t border-ink-400/40 inline-block px-4">
                      Hỗ trợ: PNG, JPG, WEBP, SVG, MP4, PDF, ZIP &bull; Tối đa 100MB/tệp
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-3 bg-danger/10 border border-danger/40 text-danger text-[13px] rounded">
                  ⚠️ {uploadError}
                </div>
              )}

              {/* R2 storage specs badge */}
              <div className="flex items-center justify-between p-3.5 bg-ink-900 border border-ink-400 rounded text-[13px] text-ink-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Kho Cloudflare R2: <strong>kandes-assets</strong></span>
                </div>
                <span className="font-mono text-electric text-[12px]">Zero Egress Fee &bull; CDN Public</span>
              </div>
            </div>
          )}

          {/* TAB 2: R2 GALLERY */}
          {activeTab === 'r2_gallery' && (
            <div className="space-y-5">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-100" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm tệp trong kho R2..."
                    className="w-full pl-9 pr-3 py-2 bg-ink-900 border border-ink-400 text-[13px] text-ink-50 rounded focus:border-electric focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchR2Files}
                    disabled={loadingR2}
                    className="p-2 bg-ink-900 border border-ink-400 text-ink-100 hover:text-ink-50 rounded"
                    title="Làm mới"
                  >
                    <RefreshCw size={15} className={loadingR2 ? 'animate-spin' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="px-3 py-2 bg-electric text-ink-900 font-mono text-[12px] font-bold uppercase rounded flex items-center gap-1.5"
                  >
                    <Upload size={13} /> TẢI THÊM TỆP
                  </button>
                </div>
              </div>

              {/* Grid of R2 items */}
              {loadingR2 ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 size={32} className="mx-auto text-electric animate-spin" />
                  <div className="text-[13px] font-mono text-ink-100">Đang tải danh sách từ Cloudflare R2...</div>
                </div>
              ) : filteredR2.length === 0 ? (
                <div className="py-16 text-center space-y-3 border border-dashed border-ink-400 rounded">
                  <FolderOpen size={40} className="mx-auto text-ink-100" />
                  <div className="text-[14px] text-ink-50">Kho R2 chưa có tệp nào phù hợp</div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2 bg-electric/10 border border-electric/40 text-electric font-mono text-[12px] font-bold uppercase rounded"
                  >
                    + TẢI TỆP ĐẦU TIÊN LÊN R2
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredR2.map((file) => {
                    const isSelected = currentUrl === file.url
                    const isImg = file.fileType === 'image'

                    return (
                      <div
                        key={file.key}
                        onClick={() => {
                          onSelect({
                            url: file.url,
                            altText: file.filename.replace(/\.[^/.]+$/, ''),
                          })
                          onClose()
                        }}
                        className={`group cursor-pointer bg-ink-900 border rounded overflow-hidden flex flex-col transition-all relative ${
                          isSelected
                            ? 'border-electric ring-1 ring-electric'
                            : 'border-ink-400 hover:border-electric/70 hover:bg-ink-800'
                        }`}
                      >
                        <div className="aspect-[4/3] bg-ink-950 flex items-center justify-center relative overflow-hidden border-b border-ink-400/60">
                          {isImg ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={file.url}
                              alt={file.filename}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : file.fileType === 'video' ? (
                            <Video size={36} className="text-electric" />
                          ) : (
                            <FileText size={36} className="text-plasma" />
                          )}

                          <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-ink-900/90 text-[8px] font-mono text-ink-100 rounded">
                            {formatBytes(file.size)}
                          </span>

                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-electric rounded-full flex items-center justify-center text-ink-900">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </div>

                        <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                          <div className="text-[13px] font-display font-medium text-ink-50 truncate group-hover:text-electric">
                            {file.filename}
                          </div>
                          <button
                            type="button"
                            className="w-full py-1 text-[11px] font-mono uppercase bg-ink-800 group-hover:bg-electric group-hover:text-ink-900 text-ink-100 border border-ink-400 rounded transition-colors"
                          >
                            {isSelected ? '✓ ĐANG CHỌN' : 'CHỌN TỆP NÀY'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredPresets.map((preset) => {
                  const isSelected = currentUrl === preset.url
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        onSelect({ url: preset.url, altText: preset.altText })
                        onClose()
                      }}
                      className={`group cursor-pointer bg-ink-900 border rounded overflow-hidden flex flex-col transition-all ${
                        isSelected ? 'border-electric ring-1 ring-electric' : 'border-ink-400 hover:border-electric/70'
                      }`}
                    >
                      <div className="aspect-[4/3] bg-ink-950 flex items-center justify-center relative overflow-hidden border-b border-ink-400">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preset.url}
                          alt={preset.altText}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {preset.badgeText && (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[8px] font-mono font-bold bg-ink-900/90 border border-electric/40 text-electric uppercase rounded">
                            {preset.badgeText}
                          </span>
                        )}
                      </div>
                      <div className="p-2.5 space-y-1.5">
                        <div className="text-[13px] font-display font-medium text-ink-50 truncate group-hover:text-electric">
                          {preset.title}
                        </div>
                        <button
                          type="button"
                          className="w-full py-1 text-[11px] font-mono uppercase bg-ink-800 group-hover:bg-electric group-hover:text-ink-900 text-ink-100 border border-ink-400 rounded transition-colors"
                        >
                          CHỌN ẢNH NÀY
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM URL */}
          {activeTab === 'custom' && (
            <div className="max-w-xl mx-auto py-6 space-y-4">
              <div>
                <label className="block text-[12px] font-mono uppercase tracking-wider text-ink-100 mb-1.5">
                  ĐƯỜNG DẪN URL / CDN *
                </label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full px-3.5 py-2.5 bg-ink-900 border border-ink-400 text-[13px] text-ink-50 focus:border-electric focus:outline-none font-mono rounded"
                />
              </div>
              <div>
                <label className="block text-[12px] font-mono uppercase tracking-wider text-ink-100 mb-1.5">
                  MÔ TẢ (ALT TEXT)
                </label>
                <input
                  type="text"
                  value={customAlt}
                  onChange={(e) => setCustomAlt(e.target.value)}
                  placeholder="vd: Cursor Pro Banner"
                  className="w-full px-3.5 py-2.5 bg-ink-900 border border-ink-400 text-[13px] text-ink-50 focus:border-electric focus:outline-none rounded"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-[13px] font-mono uppercase text-ink-100 hover:text-ink-50"
                >
                  HỦY
                </button>
                <button
                  type="button"
                  disabled={!customUrl.trim()}
                  onClick={() => {
                    onSelect({ url: customUrl.trim(), altText: customAlt.trim() || 'Product Media' })
                    onClose()
                  }}
                  className="px-6 py-2 bg-electric text-ink-900 font-display font-bold text-[13px] uppercase rounded hover:bg-electric-hover disabled:opacity-50"
                >
                  ÁP DỤNG
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
