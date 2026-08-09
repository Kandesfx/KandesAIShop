'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/product/star-rating'
import { WriteReviewForm } from '@/components/product/write-review-form'

interface ReviewReply {
  id: string
  authorName: string
  isAdmin: boolean
  content: string
  createdAt: string
}

interface Review {
  id: string
  userName: string
  rating: number
  title: string | null
  content: string
  helpfulCount: number
  createdAt: string
  reply?: ReviewReply | null
}

interface ReviewsResult {
  data: {
    reviews: Review[]
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

interface ReviewsTabProps {
  productSlug: string
}

type SortOption = 'newest' | 'oldest' | 'helpful'

export function ReviewsTab({ productSlug }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sort, setSort] = useState<SortOption>('newest')
  const [showForm, setShowForm] = useState(false)
  const [helpfulSubmitting, setHelpfulSubmitting] = useState<string | null>(null)

  const pageSize = 10

  const loadReviews = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      sort,
    })

    fetch(`/api/products/${productSlug}/reviews?${params}`)
      .then((res) => res.json())
      .then((data: ReviewsResult) => {
        setReviews(data.data?.reviews || [])
        setTotal(data.data?.total || 0)
        setLoading(false)
      })
      .catch(() => {
        setReviews([])
        setTotal(0)
        setLoading(false)
      })
  }, [productSlug, page, sort])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const handleHelpful = async (reviewId: string) => {
    setHelpfulSubmitting(reviewId)
    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' })
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r))
      )
    } catch {
      // Bỏ qua lỗi — không quan trọng đủ để hiện toast
    } finally {
      setHelpfulSubmitting(null)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-8">
      {/* Write review CTA */}
      <div>
        {showForm ? (
          <WriteReviewForm
            productSlug={productSlug}
            onSuccess={() => {
              setShowForm(false)
              setSort('newest')
              setPage(1)
              loadReviews()
            }}
          />
        ) : (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            Viết đánh giá
          </Button>
        )}
      </div>

      {/* Sort */}
      {total > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-200">
            Sắp xếp:
          </span>
          {(
            [
              { value: 'newest', label: 'Mới nhất' },
              { value: 'oldest', label: 'Cũ nhất' },
              { value: 'helpful', label: 'Hữu ích nhất' },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.value}
              variant={sort === opt.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setSort(opt.value)
                setPage(1)
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-body-sm text-ink-200">Đang tải...</div>
      ) : reviews.length === 0 ? (
        <div className="text-body-sm text-ink-200">
          Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((r) => (
            <div key={r.id} className="border border-ink-400 bg-ink-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <StarRating value={r.rating} size={14} />
                  <div className="text-[13px] text-ink-50 font-medium">{r.userName}</div>
                </div>
                <span className="text-[11px] text-ink-200">
                  {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              {r.title && <p className="text-[14px] text-ink-50 font-medium">{r.title}</p>}
              <p className="text-[13px] text-ink-100 leading-relaxed">{r.content}</p>

              {r.reply && (
                <div className="pl-4 border-l-2 border-electric">
                  <p className="text-[13px] text-ink-100">
                    <span className="font-medium text-electric">
                      {r.reply.isAdmin ? 'Shop' : r.reply.authorName}:
                    </span>{' '}
                    {r.reply.content}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleHelpful(r.id)}
                disabled={helpfulSubmitting === r.id}
                className="text-[11px] text-ink-200 hover:text-electric transition-colors"
              >
                Hữu ích ({r.helpfulCount})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </Button>
          <span className="text-[13px] text-ink-200">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  )
}
