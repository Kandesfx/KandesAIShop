'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Question {
  id: string
  question: string
  answer: string | null
  askedBy: { name: string | null; email: string }
  answeredBy: { name: string | null; email: string } | null
  createdAt: string
  answeredAt: string | null
}

interface QuestionListProps {
  productSlug: string
}

export function QuestionList({ productSlug }: QuestionListProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'answered' | 'unanswered'>('all')

  const pageSize = 10

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    })
    if (filter !== 'all') {
      params.set('answered', filter === 'answered' ? 'true' : 'false')
    }

    fetch(`/api/products/${productSlug}/questions?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions || [])
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch(() => {
        setQuestions([])
        setTotal(0)
        setLoading(false)
      })
  }, [productSlug, page, filter])

  const totalPages = Math.ceil(total / pageSize)

  if (loading) {
    return <div className="text-body-sm text-ink-200">Đang tải...</div>
  }

  if (questions.length === 0) {
    return (
      <div className="text-body-sm text-ink-200">
        {filter === 'answered' && 'Chưa có câu hỏi nào được trả lời.'}
        {filter === 'unanswered' && 'Chưa có câu hỏi chờ trả lời.'}
        {filter === 'all' && 'Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => {
            setFilter('all')
            setPage(1)
          }}
        >
          Tất cả
        </Button>
        <Button
          variant={filter === 'answered' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => {
            setFilter('answered')
            setPage(1)
          }}
        >
          Đã trả lời
        </Button>
        <Button
          variant={filter === 'unanswered' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => {
            setFilter('unanswered')
            setPage(1)
          }}
        >
          Chờ trả lời
        </Button>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q) => (
          <div key={q.id} className="border border-ink-400 bg-ink-800/40 p-4 space-y-3">
            <div>
              <p className="text-[14px] text-ink-50 font-medium mb-1">Q: {q.question}</p>
              <p className="text-[12px] text-ink-200">
                bởi {q.askedBy.name || q.askedBy.email} •{' '}
                {new Date(q.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>

            {q.answer && (
              <div className="pl-4 border-l-2 border-electric">
                <p className="text-[13px] text-ink-100 mb-1">
                  <span className="font-medium text-electric">A:</span> {q.answer}
                </p>
                {q.answeredBy && (
                  <p className="text-[12px] text-ink-200">
                    bởi {q.answeredBy.name || q.answeredBy.email} •{' '}
                    {q.answeredAt && new Date(q.answeredAt).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            )}

            {!q.answer && (
              <p className="text-[13px] text-ink-200 italic">Chưa có câu trả lời</p>
            )}
          </div>
        ))}
      </div>

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
