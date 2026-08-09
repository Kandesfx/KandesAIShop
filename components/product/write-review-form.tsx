'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface WriteReviewFormProps {
  productSlug: string
  onSuccess?: () => void
}

interface CurrentUser {
  id: string
  email: string
  name: string | null
  role: string
}

export function WriteReviewForm({ productSlug, onSuccess }: WriteReviewFormProps) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
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
    if (rating < 1) {
      setError('Vui lòng chọn số sao đánh giá')
      return
    }
    if (content.trim().length < 10) {
      setError('Nội dung đánh giá cần ít nhất 10 ký tự')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/products/${productSlug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, content: content.trim() }),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error?.message || 'Không thể gửi đánh giá')
      }

      setRating(0)
      setContent('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-body-sm text-ink-200">Đang tải...</div>
  }

  if (!user) {
    return (
      <div className="border border-ink-400 bg-ink-800/40 p-6">
        <p className="text-body-sm text-ink-100 mb-4">
          Bạn cần đăng nhập và đã mua sản phẩm này để đánh giá.
        </p>
        <a href="/auth/login">
          <Button>Đăng nhập</Button>
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-ink-400 bg-ink-800/40 p-5 space-y-4">
      <div>
        <span className="label block mb-2">Đánh giá của bạn</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Chọn số sao">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1
            const filled = starValue <= (hoverRating || rating)
            return (
              <button
                key={starValue}
                type="button"
                role="radio"
                aria-checked={rating === starValue}
                aria-label={`${starValue} sao`}
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star
                  size={22}
                  className={filled ? 'fill-warning text-warning' : 'text-ink-300'}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="review-content" className="label block mb-2">
          Nội dung đánh giá
        </label>
        <Textarea
          id="review-content"
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
          rows={4}
          disabled={submitting}
        />
      </div>

      {error && <p className="text-body-sm text-danger">{error}</p>}

      <Button type="submit" disabled={submitting || rating < 1 || content.trim().length < 10}>
        {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
      </Button>
    </form>
  )
}
