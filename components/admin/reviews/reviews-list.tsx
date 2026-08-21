'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AutoLinkText } from '@/components/ui/auto-link-text'

interface Review {
  id: string
  userId: string
  userName: string
  userEmail: string | null
  userAvatarUrl: string | null
  productId: string
  productName: string
  productSlug: string
  rating: number
  title: string | null
  content: string
  isAnonymous: boolean
  status: string
  helpfulCount: number
  createdAt: string
  reply: {
    id: string
    content: string
    createdAt: string
  } | null
}

interface ReviewsListProps {
  initialData: {
    reviews: Review[]
    page: number
    total: number
    hasMore: boolean
  }
}

function ratingStars(rating: number) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-warning/20 text-warning',
    approved: 'bg-success/20 text-success',
    rejected: 'bg-danger/20 text-danger',
  }
  const labels: Record<string, string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${styles[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN')
}

export function ReviewsList({ initialData }: ReviewsListProps) {
  const router = useRouter()
  const [reviews, setReviews] = useState(initialData.reviews)
  const [page, setPage] = useState(initialData.page)
  const [total, setTotal] = useState(initialData.total)
  const [hasMore, setHasMore] = useState(initialData.hasMore)
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [message, setMessage] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null)

  async function loadReviews(newStatus?: string) {
    setLoading(true)
    try {
      const status = newStatus ?? filterStatus
      const res = await fetch(`/api/admin/reviews?status=${status}&page=1`)
      const data = await res.json()
      if (data.ok) {
        setReviews(data.data.reviews)
        setPage(1)
        setTotal(data.data.total)
        setHasMore(data.data.hasMore)
        if (newStatus) setFilterStatus(newStatus)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleModerate(reviewId: string, status: 'approved' | 'rejected', reply?: string) {
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reply }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessage({ id: reviewId, type: 'success', text: status === 'approved' ? 'Đã duyệt' : 'Đã từ chối' })
        // Refresh
        setTimeout(() => loadReviews(), 500)
      } else {
        setMessage({ id: reviewId, type: 'error', text: data.error.message })
      }
    } catch {
      setMessage({ id: reviewId, type: 'error', text: 'Lỗi khi thực hiện' })
    }
  }

  async function loadMore() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reviews?status=${filterStatus}&page=${page + 1}`)
      const data = await res.json()
      if (data.ok) {
        setReviews([...reviews, ...data.data.reviews])
        setPage(page + 1)
        setHasMore(data.data.hasMore)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => loadReviews(status)}
            className={`px-3 py-1 text-[11px] font-mono rounded transition-colors ${
              filterStatus === status
                ? 'bg-electric text-ink-900'
                : 'bg-ink-700 text-ink-100 hover:bg-ink-600'
            }`}
          >
            {status === 'all' ? 'Tất cả' : status === 'pending' ? 'Chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="border border-ink-400 bg-ink-800/40 p-8 text-center">
            <p className="text-[12px] text-ink-200">Không có review nào</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border border-ink-400 bg-ink-800/40 p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/products/${review.productSlug}`} className="text-[12px] text-electric hover:underline">
                      {review.productName}
                    </Link>
                    {statusBadge(review.status)}
                  </div>
                  <div className="text-[11px] text-ink-200 mt-1">
                    {review.isAnonymous ? 'Ẩn danh' : review.userName}
                    {!review.isAnonymous && review.userEmail && (
                      <span className="text-[10px] ml-1">({review.userEmail})</span>
                    )}
                    <span className="mx-2">·</span>
                    <span className="text-warning">{ratingStars(review.rating)}</span>
                    <span className="mx-2">·</span>
                    <span>{review.helpfulCount} hữu ích</span>
                  </div>
                </div>
                <span className="text-[10px] text-ink-200 font-mono whitespace-nowrap">
                  {formatDate(review.createdAt)}
                </span>
              </div>

              {/* Content */}
              {review.title && (
                <h4 className="text-[13px] font-display text-ink-50 mt-2">{review.title}</h4>
              )}
              <p className="text-[12px] text-ink-100 mt-1">
                <AutoLinkText text={review.content} />
              </p>

              {/* Reply */}
              {review.reply && (
                <div className="mt-3 pl-3 border-l-2 border-electric/50">
                  <p className="text-[11px] text-electric">Shop đã trả lời:</p>
                  <p className="text-[11px] text-ink-100 mt-1">
                    <AutoLinkText text={review.reply.content} />
                  </p>
                </div>
              )}

              {/* Message */}
              {message?.id === review.id && (
                <p className={`mt-2 text-[11px] ${message.type === 'success' ? 'text-success' : 'text-danger'}`}>
                  {message.text}
                </p>
              )}

              {/* Actions */}
              {review.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleModerate(review.id, 'approved')}
                    className="btn-sm btn-success"
                    disabled={loading}
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => {
                      const reply = prompt('Lý do từ chối (optional):')
                      handleModerate(review.id, 'rejected', reply ?? undefined)
                    }}
                    className="btn-sm btn-danger"
                    disabled={loading}
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <button onClick={loadMore} className="btn-outline text-[11px]" disabled={loading}>
            {loading ? 'Đang tải...' : 'Tải thêm'}
          </button>
        </div>
      )}

      {/* Stats */}
      <p className="text-[10px] text-ink-200 font-mono text-center">
        Tổng cộng: {total} reviews
      </p>
    </div>
  )
}
