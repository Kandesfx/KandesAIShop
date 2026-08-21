'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Upload,
  Search,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Video,
  FileText,
  RefreshCw,
  Loader2,
  FolderOpen,
  Cloud,
} from 'lucide-react'
import { api } from '@/lib/api-client'

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

export default function AdminMediaPage() {
  const [files, setFiles] = useState<R2File[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ files: R2File[] }>('/api/admin/media?limit=200')
      setFiles(res.files || [])
    } catch (e) {
      console.error('Lỗi khi tải tệp R2:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)

    try {
      const formData = new FormData()
      Array.from(fileList).forEach((f) => formData.append('files', f))

      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi tải file lên')
      }

      await fetchFiles()
    } catch (e) {
      alert((e as Error).message || 'Tải file lên thất bại')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (key: string) => {
    setDeleting(true)
    try {
      await api.delete('/api/admin/media', { key })
      setFiles((prev) => prev.filter((f) => f.key !== key))
      setDeleteConfirmKey(null)
    } catch (e) {
      alert((e as Error).message || 'Xóa tệp thất bại')
    } finally {
      setDeleting(false)
    }
  }

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const filtered = files.filter((f) => {
    const matchSearch =
      search === '' ||
      f.filename.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || f.fileType === filterType
    return matchSearch && matchType
  })

  return (
    <div className="container-narrow py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-400 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
              [ ADMIN / 02 / CLOUDFLARE R2 MEDIA STORAGE ]
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono uppercase rounded flex items-center gap-1">
              <Cloud size={11} /> KHO R2 ĐANG KẾT NỐI
            </span>
          </div>
          <h1 className="text-h1 font-display">Kho Tệp Tin &amp; Media</h1>
          <p className="text-body text-ink-100 text-[13px] max-w-2xl">
            Lưu trữ hình ảnh, video HD, file tài liệu và source code không giới hạn lượt tải với <strong>0đ tiền băng thông</strong> qua Cloudflare R2 CDN.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchFiles}
            disabled={loading}
            className="px-3 py-2 bg-ink-800 hover:bg-ink-700 border border-ink-400 text-ink-200 hover:text-ink-50 rounded text-[12px] font-mono uppercase flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> LÀM MỚI
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-electric text-ink-900 font-display font-bold text-[12px] uppercase rounded hover:bg-electric-hover flex items-center gap-2 shadow"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'ĐANG TẢI...' : 'TẢI TỆP LÊN'}
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf,.zip,.rar,.txt,.json"
        className="hidden"
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (e.dataTransfer.files) handleUpload(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-electric bg-electric/10'
            : 'border-ink-400 bg-ink-800/40 hover:bg-ink-800 hover:border-electric/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 bg-electric/10 border border-electric/30 rounded-full flex items-center justify-center text-electric flex-shrink-0">
            <Upload size={22} />
          </div>
          <div>
            <div className="text-[14px] font-display font-bold text-ink-50">
              Kéo thả tệp vào đây hoặc bấm để chọn tệp từ thiết bị
            </div>
            <div className="text-[11px] text-ink-200 font-mono">
              Bucket: <strong>kandes-assets</strong> &bull; Hỗ trợ hình ảnh, video, tài liệu, file zip &bull; Max 100MB/tệp
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-ink-800 p-4 border border-ink-400 rounded">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-200" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên tệp hoặc đường dẫn..."
            className="w-full pl-9 pr-3 py-2 bg-ink-900 border border-ink-400 text-[13px] text-ink-50 rounded focus:border-electric focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'TẤT CẢ TỆP' },
            { id: 'image', label: 'HÌNH ẢNH' },
            { id: 'video', label: 'VIDEO' },
            { id: 'document', label: 'TÀI LIỆU / ZIP' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterType(t.id)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
                filterType === t.id
                  ? 'bg-electric text-ink-900 font-bold shadow'
                  : 'bg-ink-900 border border-ink-400 text-ink-200 hover:text-ink-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 size={36} className="mx-auto text-electric animate-spin" />
          <div className="text-[13px] font-mono text-ink-200">Đang tải danh sách tệp từ Cloudflare R2...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center space-y-3 border border-dashed border-ink-400 rounded bg-ink-800/30">
          <FolderOpen size={44} className="mx-auto text-ink-200" />
          <div className="text-[15px] font-display font-semibold text-ink-50">
            {search ? 'Không tìm thấy tệp tin phù hợp' : 'Chưa có tệp tin nào trong kho Cloudflare R2'}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2 bg-electric text-ink-900 font-mono text-[11px] font-bold uppercase rounded shadow"
          >
            + TẢI TỆP ĐẦU TIÊN LÊN
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((file) => {
            const isCopied = copiedKey === file.key
            const isImg = file.fileType === 'image'
            const isDeletingThis = deleteConfirmKey === file.key

            return (
              <div
                key={file.key}
                className="bg-ink-800 border border-ink-400 rounded overflow-hidden flex flex-col group hover:border-electric/70 transition-all"
              >
                {/* Media Preview Box */}
                <div className="aspect-[4/3] bg-ink-950 flex items-center justify-center relative overflow-hidden border-b border-ink-400">
                  {isImg ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : file.fileType === 'video' ? (
                    <div className="flex flex-col items-center gap-2 text-electric">
                      <Video size={40} />
                      <span className="text-[10px] font-mono uppercase">VIDEO FILE</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-plasma">
                      <FileText size={40} />
                      <span className="text-[10px] font-mono uppercase">DOCUMENT</span>
                    </div>
                  )}

                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-ink-900/90 text-[9px] font-mono text-ink-200 rounded border border-ink-400/50">
                    {formatBytes(file.size)}
                  </span>
                </div>

                {/* Details */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-[13px] font-display font-semibold text-ink-50 truncate" title={file.filename}>
                      {file.filename}
                    </h3>
                    <div className="text-[10px] font-mono text-ink-200 truncate mt-1 bg-ink-900 p-1.5 rounded border border-ink-400/40 select-all">
                      {file.url}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-ink-400/50 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(file.url, file.key)}
                      className={`flex-1 py-1.5 px-2.5 text-[11px] font-mono uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors ${
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
                          <Copy size={12} /> COPY LINK
                        </>
                      )}
                    </button>

                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-ink-900 hover:bg-ink-700 text-ink-200 hover:text-ink-50 border border-ink-400 rounded flex items-center justify-center"
                      title="Mở tệp"
                    >
                      <ExternalLink size={13} />
                    </a>

                    {isDeletingThis ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => handleDelete(file.key)}
                          className="px-2 py-1.5 bg-danger text-ink-900 text-[10px] font-mono font-bold uppercase rounded"
                        >
                          XÁC NHẬN
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmKey(null)}
                          className="px-1.5 py-1.5 text-ink-200 hover:text-ink-50 text-[10px]"
                        >
                          HỦY
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmKey(file.key)}
                        className="p-1.5 bg-ink-900 hover:bg-danger/20 hover:text-danger text-ink-200 border border-ink-400 rounded flex items-center justify-center transition-colors"
                        title="Xóa tệp khỏi R2"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
