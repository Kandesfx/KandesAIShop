'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/product/star-rating'
import { WriteReviewForm } from '@/components/product/write-review-form'
import { AutoLinkText } from '@/components/ui/auto-link-text'

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
  reply: ReviewReply | null
  createdAt: string
}

interface ReviewsResponse {
  reviews: Review[]
  total: number
  page: number
  limit: number
  totalPages: number
  avgRating: number
  counts: {
    total: number
    star5: number
    star4: number
    star3: number
    star2: number
    star1: number
  }
}

interface Props {
  productSlug: string
}

export function ReviewsTab({ productSlug }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [starFilter, setStarFilter] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [counts, setCounts] = useState({
    total: 0,
    star5: 0,
    star4: 0,
    star3: 0,
    star2: 0,
    star1: 0,
  })
  const [helpfulSubmitting, setHelpfulSubmitting] = useState<string | null>(null)

  const fetchReviews = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '10',
      ...(starFilter ? { rating: starFilter.toString() } : {}),
    })

    fetch(`/api/products/${productSlug}/reviews?${params}`)
      .then((res) => res.json())
      .then((data: { data?: ReviewsResponse }) => {
        setReviews(data.data?.reviews || [])
        setTotalPages(data.data?.totalPages || 1)
        setTotal(data.data?.total || 0)
        setAvgRating(data.data?.avgRating || 0)
        setCounts(
          data.data?.counts || {
            total: 0,
            star5: 0,
            star4: 0,
            star3: 0,
            star2: 0,
            star1: 0,
          }
        )
      })
      .finally(() => setLoading(false))
  }, [productSlug, page, starFilter])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleHelpful = async (reviewId: string) => {
    setHelpfulSubmitting(reviewId)
    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' })
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r))
      )
    } finally {
      setHelpfulSubmitting(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Write review CTA */}
      <WriteReviewForm productSlug={productSlug} onSuccess={fetchReviews} />

      {/* Summary */}
      <div className="border border-ink-400 bg-ink-800/40 p-6 flex flex-col md:flex-row items-center gap-8">
        <div className="text-center space-y-2">
          <div className="text-[48px] font-display font-bold text-ink-50 leading-none">
            {avgRating.toFixed(1)}
          </div>
          <StarRating value={avgRating} size={20} />
          <div className="text-[13px] text-ink-200">{total} đánh giá</div>
        </div>

        <div className="flex-1 space-y-2 w-full">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = counts[`star${star}` as keyof typeof counts] || 0
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <button
                key={star}
                type="button"
                onClick={() => setStarFilter(starFilter === star ? undefined : star)}
                className="w-full flex items-center gap-3 text-[13px] hover:opacity-80 transition-opacity"
              >
                <span className="w-12 text-right text-ink-100">{star} sao</span>
                <div className="flex-1 h-2 bg-ink-700 overflow-hidden">
                  <div
                    className="h-full bg-electric transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-ink-200">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter by star */}
      {total > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={starFilter === undefined ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStarFilter(undefined)}
          >
            Tất cả ({total})
          </Button>
          {[5, 4, 3, 2, 1].map((s) => (
            <Button
              key={s}
              variant={starFilter === s ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStarFilter(starFilter === s ? undefined : s)}
            >
              {s} sao ({counts[`star${s}` as keyof typeof counts] || 0})
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
                <span className="text-[12px] text-ink-200">
                  {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              {r.title && <p className="text-[14px] text-ink-50 font-medium">{r.title}</p>}
              <p className="text-[13px] text-ink-100 leading-relaxed">
                <AutoLinkText text={r.content} />
              </p>

              {r.reply && (
                <div className="pl-4 border-l-2 border-electric">
                  <p className="text-[13px] text-ink-100">
                    <span className="font-medium text-electric">
                      {r.reply.isAdmin ? 'Shop' : r.reply.authorName}:
                    </span>{' '}
                    <AutoLinkText text={r.reply.content} />
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleHelpful(r.id)}
                disabled={helpfulSubmitting === r.id}
                className="text-[12px] text-ink-200 hover:text-electric transition-colors"
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
