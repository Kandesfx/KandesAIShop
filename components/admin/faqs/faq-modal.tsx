'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { FaqView } from '@/modules/faq'

interface Props {
  faq: FaqView | null
  onClose: () => void
  onSaved: () => void
}

export function FaqModal({ faq, onClose, onSaved }: Props) {
  const isEditing = !!faq
  const [category, setCategory] = useState(faq?.category ?? 'general')
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [position, setPosition] = useState(faq?.position ?? 0)
  const [status, setStatus] = useState(faq?.status ?? 'draft')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const url = isEditing ? `/api/admin/faqs/${faq!.id}` : '/api/admin/faqs'
      const method = isEditing ? 'PATCH' : 'POST'
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, question, answer, position, status }),
      })
      const data = (await resp.json().catch(() => ({}))) as {
        ok?: boolean
        error?: { message?: string }
      }
      if (!resp.ok || !data.ok) {
        setError(data.error?.message ?? 'Lỗi')
        return
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-ink-800 border border-ink-400 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-ink-400">
          <h2 className="text-display-sm font-display">{isEditing ? 'Sửa FAQ' : 'Tạo FAQ'}</h2>
          <button onClick={onClose} className="text-ink-100 hover:text-ink-50">
            <X size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wide text-ink-100 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as never)}
              className="input-field text-[13px] w-full"
            >
              <option value="general">General</option>
              <option value="payment">Payment</option>
              <option value="delivery">Delivery</option>
              <option value="account">Account</option>
              <option value="refund">Refund</option>
              <option value="technical">Technical</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wide text-ink-100 mb-1">
              Câu hỏi
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="input-field text-[13px] w-full"
              placeholder="Câu hỏi của khách?"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wide text-ink-100 mb-1">
              Câu trả lời
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={8}
              className="input-field text-[13px] w-full font-mono"
              placeholder="Nội dung trả lời (plain text hoặc markdown)"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wide text-ink-100 mb-1">
                Position
              </label>
              <input
                type="number"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                min={0}
                className="input-field text-[13px] w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wide text-ink-100 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as never)}
                className="input-field text-[13px] w-full"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-error border border-error/30 bg-error/10 p-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-ink-400">
          <button onClick={onClose} className="btn-outline text-[12px]">
            Huỷ
          </button>
          <button onClick={save} disabled={saving} className="btn-primary text-[12px]">
            {saving ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  )
}
