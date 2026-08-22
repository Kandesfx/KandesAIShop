'use client'

import { useState, useEffect } from 'react'
import {
  Mail,
  Send,
  Search,
  RefreshCw,
  Inbox,
  CheckCircle2,
  Clock,
  Archive,
  Star,
  User,
  Reply,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Plus,
  X,
  FileText,
  Tag,
  ShieldCheck,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import type { EmailThread, EmailMessage, EmailAlias, ThreadStatus } from '@/modules/mail/types'

export default function AdminMailPage() {
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [aliases, setAliases] = useState<EmailAlias[]>([])
  const [stats, setStats] = useState<Record<string, { total: number; unread: number }>>({})
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<{ thread: EmailThread; messages: EmailMessage[] } | null>(null)
  
  const [selectedAlias, setSelectedAlias] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)

  // Reply Composer Form State
  const [replyAlias, setReplyAlias] = useState<string>('support@kandes.shop')
  const [replySubject, setReplySubject] = useState<string>('')
  const [replyBody, setReplyBody] = useState<string>('')

  // New Compose Modal State
  const [composeOpen, setComposeOpen] = useState(false)
  const [newMailTo, setNewMailTo] = useState('')
  const [newMailAlias, setNewMailAlias] = useState('support@kandes.shop')
  const [newMailSubject, setNewMailSubject] = useState('')
  const [newMailBody, setNewMailBody] = useState('')

  useEffect(() => {
    fetchThreads()
  }, [selectedAlias, selectedStatus, search])

  const fetchThreads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedAlias !== 'all') params.set('alias', selectedAlias)
      if (selectedStatus !== 'all') params.set('status', selectedStatus)
      if (search) params.set('search', search)

      const res = await api.get<{
        threads: EmailThread[]
        stats: Record<string, { total: number; unread: number }>
        aliases: EmailAlias[]
      }>(`/api/admin/mail/threads?${params.toString()}`)

      setThreads(res.threads || [])
      setStats(res.stats || {})
      setAliases(res.aliases || [])

      // Auto select first thread if none selected or selected not in list
      if (res.threads && res.threads.length > 0) {
        if (!selectedThreadId || !res.threads.find((t) => t.id === selectedThreadId)) {
          loadThreadDetails(res.threads[0]!.id)
        }
      } else {
        setSelectedThreadId(null)
        setActiveThread(null)
      }
    } catch (e) {
      console.error('Lỗi khi tải danh sách email:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadThreadDetails = async (id: string) => {
    setSelectedThreadId(id)
    setLoadingThread(true)
    try {
      const res = await api.get<{ thread: EmailThread; messages: EmailMessage[] }>(
        `/api/admin/mail/threads/${id}`
      )
      setActiveThread(res)
      
      // Auto set reply defaults
      if (res?.thread) {
        setReplyAlias(res.thread.alias || 'support@kandes.shop')
        const subj = res.thread.subject.startsWith('Re:')
          ? res.thread.subject
          : `Re: ${res.thread.subject}`
        setReplySubject(subj)
      }
    } catch (e) {
      console.error('Lỗi khi tải nội dung email:', e)
    } finally {
      setLoadingThread(false)
    }
  }

  const handleSendReply = async () => {
    if (!activeThread?.thread || !replyBody.trim()) {
      showToast('Vui lòng nhập nội dung thư trả lời', 'error')
      return
    }

    setSending(true)
    try {
      const res = await api.post<{ success: boolean; message: EmailMessage }>('/api/admin/mail/reply', {
        threadId: activeThread.thread.id,
        aliasEmail: replyAlias,
        toEmail: activeThread.thread.customerEmail,
        subject: replySubject || `Re: ${activeThread.thread.subject}`,
        bodyHtml: replyBody,
      })

      showToast(`Đã gửi email trả lời từ ${replyAlias} thành công!`, 'success')
      setReplyBody('')
      
      // Reload current thread messages
      if (activeThread.thread.id) {
        loadThreadDetails(activeThread.thread.id)
      }
      fetchThreads()
    } catch (e) {
      showToast((e as Error).message || 'Gửi email thất bại', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleSendNewMail = async () => {
    if (!newMailTo.includes('@') || !newMailSubject.trim() || !newMailBody.trim()) {
      showToast('Vui lòng điền đầy đủ email người nhận, tiêu đề và nội dung', 'error')
      return
    }

    setSending(true)
    try {
      await api.post('/api/admin/mail/reply', {
        aliasEmail: newMailAlias,
        toEmail: newMailTo,
        subject: newMailSubject,
        bodyHtml: newMailBody,
      })

      showToast(`Đã gửi email mới tới ${newMailTo} từ ${newMailAlias}!`, 'success')
      setComposeOpen(false)
      setNewMailTo('')
      setNewMailSubject('')
      setNewMailBody('')
      fetchThreads()
    } catch (e) {
      showToast((e as Error).message || 'Gửi email thất bại', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleUpdateStatus = async (status: ThreadStatus) => {
    if (!selectedThreadId) return
    try {
      await api.patch(`/api/admin/mail/threads/${selectedThreadId}`, { status })
      showToast(`Đã cập nhật trạng thái thư thành ${status}`, 'success')
      if (activeThread) {
        setActiveThread({
          ...activeThread,
          thread: { ...activeThread.thread, status },
        })
      }
      fetchThreads()
    } catch (e) {
      showToast('Không thể cập nhật trạng thái', 'error')
    }
  }

  const applyTemplate = (content: string) => {
    setReplyBody((prev) => (prev ? `${prev}\n\n${content}` : content))
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const copyCustomerEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const currentAliasObj = aliases.find((a) => a.email.toLowerCase() === (activeThread?.thread.alias || '').toLowerCase())

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-ink-900 overflow-hidden">
      {/* Top Header Navigation */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-400/80 bg-ink-800/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric/10 text-electric border border-electric/30">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-ink-50 font-display flex items-center gap-2">
              Hộp Thư Email & Hỗ Trợ Khách Hàng
              <span className="text-[10px] font-mono font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Multi-Alias Domain Active
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchThreads}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-ink-700 hover:bg-ink-600 border border-ink-400 text-xs font-mono text-ink-100 transition-colors"
            title="Làm mới hộp thư"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-gradient-buy-now text-ink-900 text-xs font-mono font-bold uppercase tracking-wider shadow-glow-electric hover:opacity-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Soạn thư mới</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        {/* ================= COLUMN 1: Aliases & Folder Filter (2.5 Cols) ================= */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r border-ink-400/80 bg-ink-900/60 p-3 space-y-5 overflow-y-auto">
          {/* Folders */}
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-mono font-bold uppercase tracking-wider text-ink-300 mb-2">
              Hộp thư
            </div>
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-electric/15 text-electric border border-electric/30 font-bold'
                  : 'text-ink-200 hover:bg-ink-800/80 hover:text-ink-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Inbox className="h-4 w-4" /> Tất cả thư
              </span>
              <span className="font-mono text-[11px]">{stats.all?.total || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('unread')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedStatus === 'unread'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold'
                  : 'text-ink-200 hover:bg-ink-800/80 hover:text-ink-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" /> Chưa đọc
              </span>
              <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-500/20 px-1.5 py-0.2 rounded-full">
                {stats.all?.unread || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('replied')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedStatus === 'replied'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-ink-200 hover:bg-ink-800/80 hover:text-ink-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Đã trả lời
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('archived')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedStatus === 'archived'
                  ? 'bg-ink-700 text-ink-50 border border-ink-400 font-bold'
                  : 'text-ink-200 hover:bg-ink-800/80 hover:text-ink-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-ink-300" /> Lưu trữ
              </span>
            </button>
          </div>

          {/* Domain Aliases */}
          <div className="space-y-1 pt-3 border-t border-ink-400/50">
            <div className="px-3 text-[11px] font-mono font-bold uppercase tracking-wider text-ink-300 mb-2 flex items-center justify-between">
              <span>Alias Tên Miền</span>
              <Tag className="h-3 w-3" />
            </div>

            <button
              type="button"
              onClick={() => setSelectedAlias('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                selectedAlias === 'all'
                  ? 'bg-ink-700/80 text-ink-50 font-bold border border-ink-400'
                  : 'text-ink-200 hover:bg-ink-800/60 hover:text-ink-100'
              }`}
            >
              <span>🌐 Tất cả Alias</span>
              <span className="font-mono text-[10px]">{stats.all?.total || 0}</span>
            </button>

            {aliases.map((a) => {
              const count = stats[a.id]?.total || 0
              const unread = stats[a.id]?.unread || 0
              const isSelected = selectedAlias === a.email

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAlias(a.email)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-ink-700 text-ink-50 font-bold border border-ink-400 shadow-sm'
                      : 'text-ink-200 hover:bg-ink-800/60 hover:text-ink-100'
                  }`}
                >
                  <div className="truncate pr-1">
                    <div className="truncate font-mono text-[11px]">{a.email.split('@')[0]}@</div>
                    <div className="text-[10px] text-ink-300 truncate">{a.name}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {unread > 0 && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                    <span className="font-mono text-[10px] text-ink-300">{count}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ================= COLUMN 2: Thread List & Search (3.5 Cols) ================= */}
        <section className="col-span-12 md:col-span-4 lg:col-span-4 border-r border-ink-400/80 bg-ink-900/40 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-ink-400/80 bg-ink-800/40">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-300" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm người gửi, email, tiêu đề, mã đơn..."
                className="w-full pl-9 pr-4 py-2 bg-ink-900/90 border border-ink-400 rounded-lg text-xs text-ink-50 placeholder:text-ink-400 focus:border-electric focus:ring-1 focus:ring-electric"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-ink-400/40">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-ink-300 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-electric" />
                <span className="text-xs font-mono">Đang tải danh sách thư...</span>
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-ink-300 space-y-2">
                <Inbox className="h-8 w-8 mx-auto text-ink-400" />
                <p className="text-xs">Không tìm thấy thư nào trong mục này</p>
              </div>
            ) : (
              threads.map((t) => {
                const isSelected = t.id === selectedThreadId
                const isUnread = t.status === 'unread'
                const threadAlias = aliases.find((a) => a.email.toLowerCase() === t.alias.toLowerCase())

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => loadThreadDetails(t.id)}
                    className={`w-full text-left p-3.5 transition-colors block relative ${
                      isSelected
                        ? 'bg-electric/10 border-l-2 border-l-electric'
                        : isUnread
                          ? 'bg-ink-800/60 hover:bg-ink-800'
                          : 'hover:bg-ink-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 truncate">
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" title="Chưa đọc" />
                        )}
                        <span className={`text-xs font-medium truncate ${isUnread ? 'font-bold text-ink-50' : 'text-ink-100'}`}>
                          {t.customerName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-ink-300 shrink-0">
                        {new Date(t.lastMessageAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${threadAlias?.badgeBg || 'bg-ink-700'} ${threadAlias?.badgeText || 'text-ink-200'}`}>
                        {t.alias.split('@')[0]}
                      </span>
                      {t.orderNumber && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sunset/15 text-sunset border border-sunset/30">
                          #{t.orderNumber}
                        </span>
                      )}
                      {t.status === 'replied' && (
                        <span className="text-[9px] font-mono text-emerald-400">✓ Đã trả lời</span>
                      )}
                    </div>

                    <div className={`text-xs truncate font-display mb-1 ${isUnread ? 'font-semibold text-ink-50' : 'text-ink-100'}`}>
                      {t.subject}
                    </div>

                    <p className="text-[11px] text-ink-300 line-clamp-2 leading-relaxed">
                      {t.lastSnippet}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </section>

        {/* ================= COLUMN 3: Reading Pane & Reply Composer (6 Cols) ================= */}
        <main className="col-span-12 md:col-span-5 lg:col-span-6 bg-ink-900 flex flex-col overflow-hidden">
          {loadingThread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-300 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-electric" />
              <span className="text-xs font-mono">Đang tải cuộc hội thoại...</span>
            </div>
          ) : !activeThread?.thread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-300 p-8 text-center gap-3">
              <Mail className="h-12 w-12 text-ink-500 stroke-1" />
              <div className="text-sm font-medium text-ink-200">Chọn một bức thư để xem và trả lời</div>
              <p className="text-xs text-ink-400 max-w-sm">
                Bạn có thể phản hồi trực tiếp khách hàng qua từng Alias tên miền như support@, billing@, sales@...
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Thread Header */}
              <div className="p-4 border-b border-ink-400/80 bg-ink-800/50 shrink-0 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-ink-50 font-display leading-snug">
                      {activeThread.thread.subject}
                    </h2>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-ink-200 font-medium">{activeThread.thread.customerName}</span>
                      <span className="text-ink-400 font-mono text-[11px]">&lt;{activeThread.thread.customerEmail}&gt;</span>
                      <button
                        type="button"
                        onClick={() => copyCustomerEmail(activeThread.thread.customerEmail)}
                        className="text-ink-400 hover:text-electric p-0.5"
                        title="Sao chép email"
                      >
                        {copiedEmail ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(activeThread.thread.status === 'unread' ? 'read' : 'unread')}
                      className="px-2.5 py-1 rounded bg-ink-700 hover:bg-ink-600 border border-ink-400 text-[11px] font-mono text-ink-200"
                    >
                      {activeThread.thread.status === 'unread' ? 'Đã đọc' : 'Chưa đọc'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('archived')}
                      className="px-2.5 py-1 rounded bg-ink-700 hover:bg-ink-600 border border-ink-400 text-[11px] font-mono text-ink-200"
                      title="Lưu trữ"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-ink-400/40 text-xs">
                  <span className="text-ink-300 font-mono text-[11px]">Kênh nhận:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${currentAliasObj?.badgeBg || 'bg-ink-700'} ${currentAliasObj?.badgeText || 'text-ink-200'}`}>
                    {activeThread.thread.alias} ({currentAliasObj?.name || 'Kandes'})
                  </span>
                  {activeThread.thread.orderNumber && (
                    <span className="text-sunset text-[11px] font-mono">
                      Liên quan đơn hàng: #{activeThread.thread.orderNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Message Bubbles History (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-ink-900/60">
                {activeThread.messages.map((msg) => {
                  const isInbound = msg.direction === 'inbound'

                  return (
                    <div
                      key={msg.id}
                      className={`rounded-xl border p-4 shadow-sm transition-all ${
                        isInbound
                          ? 'bg-ink-800/90 border-ink-400/80 ml-0 mr-6'
                          : 'bg-ink-900/95 border-electric/40 ml-6 mr-0 shadow-glow-electric/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-ink-400/40">
                        <div className="flex items-center gap-2">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isInbound ? 'bg-ink-700 text-ink-100' : 'bg-electric text-ink-900'
                          }`}>
                            {isInbound ? <User className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-ink-50 font-display">
                              {msg.fromName}
                            </span>
                            <span className="text-[10px] text-ink-400 font-mono ml-2">
                              &lt;{msg.fromEmail}&gt;
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] font-mono text-ink-300">
                          {new Date(msg.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>

                      {/* Content */}
                      <div
                        className="text-xs text-ink-100 leading-relaxed space-y-2 prose-invert"
                        dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Reply Box Composer */}
              <div className="border-t border-ink-400/80 bg-ink-800/90 p-4 shrink-0 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Alias Picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-ink-200">Gửi từ:</span>
                    <select
                      value={replyAlias}
                      onChange={(e) => setReplyAlias(e.target.value)}
                      className="bg-ink-900 border border-ink-400 rounded-lg px-2.5 py-1 text-xs font-mono text-electric focus:border-electric focus:ring-1 focus:ring-electric"
                    >
                      {aliases.map((a) => (
                        <option key={a.id} value={a.email}>
                          {a.name} &lt;{a.email}&gt;
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Canned Templates Quick Picker */}
                  {currentAliasObj?.quickTemplates && currentAliasObj.quickTemplates.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-md">
                      <span className="text-[11px] font-mono text-ink-400 shrink-0">Mẫu nhanh:</span>
                      {currentAliasObj.quickTemplates.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => applyTemplate(tpl.content)}
                          className="px-2 py-0.5 bg-ink-700 hover:bg-ink-600 text-ink-200 text-[10px] rounded border border-ink-400/80 shrink-0 transition-colors"
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={`Soạn phản hồi gửi tới ${activeThread.thread.customerEmail}... (Hỗ trợ định dạng văn bản)`}
                    className="w-full p-3 bg-ink-900/90 border border-ink-400 rounded-lg text-xs text-ink-50 placeholder:text-ink-400 focus:border-electric focus:ring-1 focus:ring-electric font-sans leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono text-ink-400">
                    Thư được gửi trực tiếp qua Resend API từ domain <strong>{replyAlias}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sending || !replyBody.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded bg-gradient-buy-now text-ink-900 text-xs font-mono font-bold uppercase tracking-wider shadow-glow-electric hover:opacity-95 transition-all disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Gửi phản hồi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= MODAL: COMPOSE NEW MAIL ================= */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-ink-900 border border-ink-400 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-400 bg-ink-800">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-electric" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-50">
                  Soạn Thư Mới Tới Khách Hàng
                </span>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="text-ink-300 hover:text-ink-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 mb-1">
                  Gửi từ Alias
                </label>
                <select
                  value={newMailAlias}
                  onChange={(e) => setNewMailAlias(e.target.value)}
                  className="w-full bg-ink-800 border border-ink-400 rounded-lg px-3 py-2 text-xs font-mono text-electric"
                >
                  {aliases.map((a) => (
                    <option key={a.id} value={a.email}>
                      {a.name} &lt;{a.email}&gt;
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 mb-1">
                  Đến địa chỉ Email khách hàng
                </label>
                <input
                  type="email"
                  value={newMailTo}
                  onChange={(e) => setNewMailTo(e.target.value)}
                  placeholder="khachhang@gmail.com"
                  className="w-full bg-ink-800 border border-ink-400 rounded-lg px-3 py-2 text-xs text-ink-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 mb-1">
                  Tiêu đề email
                </label>
                <input
                  type="text"
                  value={newMailSubject}
                  onChange={(e) => setNewMailSubject(e.target.value)}
                  placeholder="Thông báo bàn giao bản quyền / Hỗ trợ dịch vụ Kandes.shop"
                  className="w-full bg-ink-800 border border-ink-400 rounded-lg px-3 py-2 text-xs text-ink-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 mb-1">
                  Nội dung thư
                </label>
                <textarea
                  rows={6}
                  value={newMailBody}
                  onChange={(e) => setNewMailBody(e.target.value)}
                  placeholder="Nhập nội dung thư gửi khách hàng..."
                  className="w-full bg-ink-800 border border-ink-400 rounded-lg p-3 text-xs text-ink-50 leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-ink-400 bg-ink-800/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="px-4 py-2 rounded text-xs font-mono text-ink-200 hover:bg-ink-700"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSendNewMail}
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2 rounded bg-gradient-buy-now text-ink-900 text-xs font-mono font-bold uppercase tracking-wider shadow-glow-electric"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Gửi thư ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border text-xs font-mono shadow-2xl backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
              : 'bg-red-950/90 border-red-500/40 text-red-300 shadow-red-500/10'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
