'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

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
        setError(data.error?.message ?? 'Gửi thất bại')
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi mạng')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="border border-success/50 bg-success/10 p-6 text-center space-y-2">
        <CheckCircle2 size={32} strokeWidth={1.5} className="text-success mx-auto" aria-hidden />
        <h2 className="text-display-sm font-display text-success">Đã gửi!</h2>
        <p className="text-[12px] text-ink-200">
          Đội ngũ kandes.shop sẽ phản hồi <strong>{email}</strong> trong 24h làm việc.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
            Tên của bạn
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            className="input-field text-[12px] w-full"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field text-[12px] w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
            Số điện thoại (tuỳ chọn)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field text-[12px] w-full"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
            Loại yêu cầu
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field text-[12px] w-full"
          >
            <option value="">— Chọn —</option>
            <option value="order">Đơn hàng</option>
            <option value="payment">Thanh toán</option>
            <option value="delivery">Giao hàng</option>
            <option value="refund">Hoàn tiền</option>
            <option value="account">Tài khoản</option>
            <option value="other">Khác</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
          Tiêu đề
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          className="input-field text-[12px] w-full"
        />
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
          Nội dung
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="input-field text-[12px] w-full"
        />
      </div>

      {error && (
        <div className="border border-error/50 bg-error/10 p-2 text-[11px] text-error">
          <AlertCircle size={12} strokeWidth={1.5} className="inline mr-1" aria-hidden />
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary text-[11px] h-10">
        {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
      </button>
    </form>
  )
}
