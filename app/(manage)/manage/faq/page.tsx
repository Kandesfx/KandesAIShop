import { faqService } from '@/modules/faq'
import { FaqsTable } from '@/components/admin/faqs/faqs-table'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { status?: string; category?: string; page?: string }
}

export default async function AdminFaqsPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page) || 1
  const limit = 20

  const result = await faqService.listAdmin({
    page,
    limit,
    status: searchParams.status,
    category: searchParams.category,
  })

  return (
    <div className="container-narrow py-8 space-y-6">
      <div className="space-y-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / FAQS ]
        </span>
        <h1 className="text-display-lg font-display">
          FAQ
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[13px] text-ink-100">
          Quản lý câu hỏi thường gặp — {result.total} bản ghi.
        </p>
      </div>

      <FaqsTable
        initialData={result}
        currentFilters={{
          status: searchParams.status,
          category: searchParams.category,
          page: searchParams.page,
        }}
      />
    </div>
  )
}
