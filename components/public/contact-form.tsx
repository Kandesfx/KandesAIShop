'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Send, Loader2 } from 'lucide-react'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message, category }),
      })
      const data = (await resp.json().catch(() => ({}))) as {
        ok?: boolean
        error?: { message?: string }
      }
      if (!resp.ok || !data.ok) {
        setError(data.error?.message ?? 'Gửi thất bại. Vui lòng thử lại.')
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối mạng.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-ink-800/90 border border-blue-500/40 p-8 text-center space-y-3 rounded-2xl shadow-xl">
        <CheckCircle2 size={40} className="text-sky-400 mx-auto" />
        <h2 className="text-[20px] font-display font-bold text-ink-50">Yêu cầu đã được gửi!</h2>
        <p className="text-[13px] text-ink-100 max-w-md mx-auto">
          Đội ngũ Kandes.shop sẽ phản hồi tới email <strong className="text-sky-300 font-mono">{email}</strong> trong vòng 24h làm việc.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl bg-ink-800/80 border border-ink-400 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 font-bold mb-1.5">
            TÊN CỦA BẠN <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            placeholder="Nhập họ và tên..."
            className="w-full bg-ink-900 border border-ink-400 text-ink-50 text-[13px] px-4 py-3 rounded-xl placeholder:text-ink-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 font-bold mb-1.5">
            EMAIL <span className="text-rose-400">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@example.com"
            className="w-full bg-ink-900 border border-ink-400 text-ink-50 text-[13px] px-4 py-3 rounded-xl placeholder:text-ink-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 font-bold mb-1.5">
            SỐ ĐIỆN THOẠI (TUỲ CHỌN)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912xxx..."
            className="w-full bg-ink-900 border border-ink-400 text-ink-50 text-[13px] px-4 py-3 rounded-xl placeholder:text-ink-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 font-bold mb-1.5">
            LOẠI YÊU CẦU
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-ink-900 border border-ink-400 text-ink-50 text-[13px] px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
          >
            <option value="" className="bg-ink-900 text-ink-200">— Chọn loại hỗ trợ —</option>
            <option value="order" className="bg-ink-900 text-ink-50">Đơn hàng</option>
            <option value="payment" className="bg-ink-900 text-ink-50">Thanh toán</option>
            <option value="delivery" className="bg-ink-900 text-ink-50">Giao hàng</option>
            <option value="refund" className="bg-ink-900 text-ink-50">Hoàn tiền</option>
            <option value="account" className="bg-ink-900 text-ink-50">Tài khoản & Key</option>
            <option value="other" className="bg-ink-900 text-ink-50">Khác</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 font-bold mb-1.5">
          TIÊU ĐỀ <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          placeholder="Tóm tắt ngắn gọn yêu cầu..."
          className="w-full bg-ink-900 border border-ink-400 text-ink-50 text-[13px] px-4 py-3 rounded-xl placeholder:text-ink-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
        />
      </div>

      <div>
        <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-200 font-bold mb-1.5">
          NỘI DUNG <span className="text-rose-400">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder="Mô tả chi tiết nội dung cần hỗ trợ..."
          className="w-full bg-ink-900 border border-ink-400 text-ink-50 text-[13px] px-4 py-3 rounded-xl placeholder:text-ink-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner resize-y"
        />
      </div>

      {error && (
        <div className="border border-rose-500/40 bg-rose-500/10 p-3 rounded-xl text-[12px] text-rose-300 font-mono flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-display font-bold text-[13px] uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Đang gửi...
          </>
        ) : (
          <>
            <Send size={16} />
            Gửi yêu cầu hỗ trợ
          </>
        )}
      </button>
    </form>
  )
}
