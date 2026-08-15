'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter } from 'lucide-react'
import type { FaqView } from '@/modules/faq'
import { FaqModal } from './faq-modal'

interface Props {
  initialData: { items: FaqView[]; total: number; hasMore: boolean }
  currentFilters: { status?: string; category?: string; page?: string }
}

export function FaqsTable({ initialData, currentFilters }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(currentFilters.status ?? '')
  const [category, setCategory] = useState(currentFilters.category ?? '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FaqView | null>(null)

  function applyFilters() {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (category) params.set('category', category)
    router.push(`/manage/faq${params.toString() ? `?${params.toString()}` : ''}`)
  }

  function clearFilters() {
    setStatus('')
    setCategory('')
    router.push('/manage/faq')
  }

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(faq: FaqView) {
    setEditing(faq)
    setModalOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá FAQ này?')) return
    const resp = await fetch(`/api/admin/faqs/${id}`, { method: 'DELETE' })
    if (resp.ok) {
      router.refresh()
    } else {
      const data = await resp.json().catch(() => ({}))
      alert((data as { error?: { message?: string } }).error?.message ?? 'Lỗi')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters + New */}
      <div className="border border-ink-400 bg-ink-800/40 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <Filter size={14} strokeWidth={1.5} className="text-ink-200 mb-1" aria-hidden />

          <div>
            <label className="block text-[10px] text-ink-200 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field text-[12px] min-w-[130px]"
            >
              <option value="">— Tất cả —</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-ink-200 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field text-[12px] min-w-[130px]"
            >
              <option value="">— Tất cả —</option>
              <option value="general">General</option>
              <option value="payment">Payment</option>
              <option value="delivery">Delivery</option>
              <option value="account">Account</option>
              <option value="refund">Refund</option>
              <option value="technical">Technical</option>
            </select>
          </div>

          <button onClick={applyFilters} className="btn-primary text-[11px] h-9">
            <Search size={12} strokeWidth={1.5} className="inline mr-1" aria-hidden />
            Lọc
          </button>
          <button onClick={clearFilters} className="btn-outline text-[11px] h-9">
            Xoá
          </button>

          <div className="flex-1" />

          <button onClick={openCreate} className="btn-primary text-[11px] h-9">
            <Plus size={12} strokeWidth={1.5} className="inline mr-1" aria-hidden />
            Tạo FAQ
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-ink-400 bg-ink-800/40 overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] text-ink-200 font-mono uppercase bg-ink-700/50">
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Câu hỏi</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Position</th>
              <th className="text-right p-3">Views</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-400/30">
            {initialData.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-ink-200 text-[11px]">
                  Chưa có FAQ nào.
                </td>
              </tr>
            ) : (
              initialData.items.map((faq) => (
                <tr key={faq.id} className="hover:bg-ink-700/30">
                  <td className="p-3 text-ink-200 font-mono text-[10px]">{faq.id.slice(0, 8)}…</td>
                  <td className="p-3">
                    <span className="text-electric font-mono text-[10px] uppercase">
                      {faq.category}
                    </span>
                  </td>
                  <td className="p-3 text-ink-50">{faq.question}</td>
                  <td className="p-3">
                    <StatusBadge status={faq.status} />
                  </td>
                  <td className="p-3 text-right text-ink-200">{faq.position}</td>
                  <td className="p-3 text-right text-ink-200">{faq.viewCount}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(faq)}
                        className="text-[10px] text-electric hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id)}
                        className="text-[10px] text-error hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-ink-200">
        Tổng {initialData.total} FAQ. {initialData.hasMore ? 'Còn trang sau.' : ''}
      </p>

      {modalOpen && (
        <FaqModal
          faq={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: FaqView['status'] }) {
  const styles = {
    draft: 'bg-ink-600/30 text-ink-200',
    published: 'bg-success/20 text-success',
    archived: 'bg-warning/20 text-warning',
  } as const
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${styles[status]}`}>{status}</span>
  )
}
