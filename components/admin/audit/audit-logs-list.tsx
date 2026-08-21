'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AuditListResult } from '@/modules/audit'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'

interface Props {
  initialData: AuditListResult
  actions: string[]
  currentFilters: {
    action?: string
    actorId?: string
    resourceType?: string
    from?: string
    to?: string
  }
}

export function AuditLogsList({ initialData, actions, currentFilters }: Props) {
  const router = useRouter()
  const [action, setAction] = useState(currentFilters.action ?? '')
  const [actorId, setActorId] = useState(currentFilters.actorId ?? '')
  const [resourceType, setResourceType] = useState(currentFilters.resourceType ?? '')
  const [from, setFrom] = useState(currentFilters.from?.slice(0, 10) ?? '')
  const [to, setTo] = useState(currentFilters.to?.slice(0, 10) ?? '')

  function applyFilters() {
    const params = new URLSearchParams()
    if (action) params.set('action', action)
    if (actorId) params.set('actorId', actorId)
    if (resourceType) params.set('resourceType', resourceType)
    if (from) params.set('from', `${from}T00:00:00.000Z`)
    if (to) params.set('to', `${to}T23:59:59.999Z`)
    const qs = params.toString()
    router.push(`/manage/audit${qs ? `?${qs}` : ''}`)
  }

  function clearFilters() {
    setAction('')
    setActorId('')
    setResourceType('')
    setFrom('')
    setTo('')
    router.push('/manage/audit')
  }

  function goPage(page: number) {
    const params = new URLSearchParams()
    if (action) params.set('action', action)
    if (actorId) params.set('actorId', actorId)
    if (resourceType) params.set('resourceType', resourceType)
    if (from) params.set('from', `${from}T00:00:00.000Z`)
    if (to) params.set('to', `${to}T23:59:59.999Z`)
    if (page > 1) params.set('page', String(page))
    router.push(`/manage/audit${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="border border-ink-400 bg-ink-800/40 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <Filter size={14} strokeWidth={1.5} className="text-ink-100 mb-1" aria-hidden />

          <div>
            <label className="block text-[11px] text-ink-100 mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="input-field text-[13px] min-w-[150px]"
            >
              <option value="">— Tất cả —</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-ink-100 mb-1">Actor ID</label>
            <input
              type="text"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="UUID"
              className="input-field text-[13px] min-w-[220px]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-ink-100 mb-1">Resource type</label>
            <input
              type="text"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              placeholder="vd: order, user, faq"
              className="input-field text-[13px] min-w-[160px]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-ink-100 mb-1">Từ</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input-field text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-ink-100 mb-1">Đến</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input-field text-[13px]"
            />
          </div>

          <button onClick={applyFilters} className="btn-primary text-[12px] h-9">
            Lọc
          </button>
          <button onClick={clearFilters} className="btn-outline text-[12px] h-9">
            Xoá
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-ink-400 bg-ink-800/40 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11px] text-ink-100 font-mono uppercase bg-ink-700/50">
              <th className="text-left p-3">Thời gian</th>
              <th className="text-left p-3">Actor</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Resource</th>
              <th className="text-left p-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-400/30">
            {initialData.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-ink-100 text-[12px]">
                  Không có audit log nào match filter.
                </td>
              </tr>
            ) : (
              initialData.items.map((log) => (
                <tr key={log.id} className="hover:bg-ink-700/30">
                  <td className="p-3 font-mono text-[11px] text-ink-100 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3">
                    <p className="text-ink-50 text-[12px]">
                      {log.actorName ?? log.actorEmail ?? '—'}
                    </p>
                    <p className="text-[11px] text-ink-100 font-mono">
                      {log.actorType}
                      {log.actorId ? ` · ${log.actorId.slice(0, 8)}…` : ''}
                    </p>
                  </td>
                  <td className="p-3">
                    <span className="text-electric font-mono text-[12px]">{log.action}</span>
                  </td>
                  <td className="p-3 text-[12px] text-ink-100 font-mono">
                    {log.resourceType ? (
                      <>
                        <span>{log.resourceType}</span>
                        {log.resourceId && (
                          <span className="text-ink-100/60"> · {log.resourceId.slice(0, 8)}…</span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3 text-[11px] font-mono text-ink-100">{log.ipAddress ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-[12px] text-ink-100">
        <span>
          Trang {initialData.page} · {initialData.total} bản ghi
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => goPage(initialData.page - 1)}
            disabled={initialData.page <= 1}
            className="btn-outline text-[12px] inline-flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft size={12} strokeWidth={1.5} aria-hidden />
            Trước
          </button>
          <button
            type="button"
            onClick={() => goPage(initialData.page + 1)}
            disabled={!initialData.hasMore}
            className="btn-outline text-[12px] inline-flex items-center gap-1 disabled:opacity-40"
          >
            Sau
            <ChevronRight size={12} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
