'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface AskQuestionFormProps {
  productSlug: string
  onSuccess?: () => void
}

interface CurrentUser {
  id: string
  email: string
  name: string | null
  role: string
}

export function AskQuestionForm({ productSlug, onSuccess }: AskQuestionFormProps) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null)
        setLoading(false)
      })
      .catch(() => {
        setUser(null)
        setLoading(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!question.trim()) {
      setError('Vui lòng nhập câu hỏi')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/me/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productSlug, question: question.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Không thể gửi câu hỏi')
      }

      setQuestion('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-body-sm text-ink-200">Đang tải...</div>
    )
  }

  if (!user) {
    return (
      <div className="border border-ink-400 bg-ink-800/40 p-6">
        <p className="text-body-sm text-ink-100 mb-4">
          Bạn cần đăng nhập để đặt câu hỏi về sản phẩm này.
        </p>
        <a href="/login">
          <Button>Đăng nhập</Button>
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="question-input" className="label block mb-2">
          Câu hỏi của bạn
        </label>
        <Textarea
          id="question-input"
          value={question}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuestion(e.target.value)}
          placeholder="Ví dụ: Sản phẩm này có hỗ trợ tiếng Việt không?"
          rows={4}
          disabled={submitting}
        />
      </div>

      {error && (
        <p className="text-body-sm text-danger">{error}</p>
      )}

      <Button type="submit" disabled={submitting || !question.trim()}>
        {submitting ? 'Đang gửi...' : 'Gửi câu hỏi'}
      </Button>
    </form>
  )
}
