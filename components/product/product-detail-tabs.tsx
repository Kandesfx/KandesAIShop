'use client'

import { useState } from 'react'
import { QuestionList } from './question-list'
import { AskQuestionForm } from './ask-question-form'

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
      <div className="flex gap-4 border-b border-hairline">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reviews'
              ? 'border-accent text-ink'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Đánh giá ({reviewsCount})
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'qa'
              ? 'border-accent text-ink'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Hỏi đáp ({questionsCount})
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <p className="text-sm text-muted">
              Chức năng đánh giá sẽ được triển khai trong giai đoạn tiếp theo.
            </p>
          </div>
        )}

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
