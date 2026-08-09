'use client'

import { useState } from 'react'
import { QuestionList } from './question-list'
import { AskQuestionForm } from './ask-question-form'
import { ReviewsTab } from './reviews-tab'

interface ProductDetailTabsProps {
  productSlug: string
  reviewsCount: number
  questionsCount: number
}

export function ProductDetailTabs({
  productSlug,
  reviewsCount,
  questionsCount,
}: ProductDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'reviews' | 'qa'>('reviews')
  const [refresh, setRefresh] = useState(0)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-ink-400">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 px-1 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === 'reviews'
              ? 'border-electric text-ink-50'
              : 'border-transparent text-ink-200 hover:text-ink-50'
          }`}
        >
          Đánh giá ({reviewsCount})
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`pb-3 px-1 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === 'qa'
              ? 'border-electric text-ink-50'
              : 'border-transparent text-ink-200 hover:text-ink-50'
          }`}
        >
          Hỏi đáp ({questionsCount})
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'reviews' && <ReviewsTab productSlug={productSlug} />}

        {activeTab === 'qa' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Đặt câu hỏi</h3>
              <AskQuestionForm
                productSlug={productSlug}
                onSuccess={() => setRefresh((r) => r + 1)}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Câu hỏi từ khách hàng</h3>
              <QuestionList key={refresh} productSlug={productSlug} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
