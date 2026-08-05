'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Account data page — P7-06 GDPR.
 *
 * User can export all their data or request account deletion.
 * Export: download JSON via API.
 * Delete: soft-delete (GDPR pattern — anonymize instead of hard delete for order history).
 */
export default function AccountDataPage() {
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleExport() {
    setExporting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/me/export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kandes-data-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: 'Đã tải dữ liệu thành công.' })
    } catch {
      setMessage({ type: 'error', text: 'Tải dữ liệu thất bại. Thử lại.' })
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Bạn chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.')) return
    if (!confirm('Tất cả dữ liệu sẽ bị xóa vĩnh viễn. Tiếp tục?')) return
    setDeleting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/me/delete', { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) {
        window.location.href = '/?deleted=1'
      } else {
        setMessage({ type: 'error', text: data.error?.message ?? 'Xóa thất bại.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Xóa thất bại. Thử lại.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="container-narrow mx-auto py-12 px-4">
      <h1 className="text-display-md font-display mb-2">Dữ liệu của bạn</h1>
      <p className="text-body text-ink-100 mb-8">
        Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, bạn có quyền truy cập và xóa dữ liệu.
      </p>

      {message && (
        <div className={`mb-6 rounded border px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'border-green-500/30 bg-green-500/10 text-green-400'
            : 'border-red-500/30 bg-red-500/10 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded border border-ink-400 p-6">
          <h2 className="text-title-lg font-semibold mb-2">Xuất dữ liệu</h2>
          <p className="text-body-sm text-ink-100 mb-4">
            Tải về toàn bộ dữ liệu của bạn dưới dạng file JSON: thông tin tài khoản,
            đơn hàng, API keys, sessions.
          </p>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? 'Đang tải...' : 'Tải dữ liệu của tôi'}
          </Button>
        </div>

        <div className="rounded border border-red-500/20 p-6">
          <h2 className="text-title-lg font-semibold mb-2 text-red-400">Xóa tài khoản</h2>
          <p className="text-body-sm text-ink-100 mb-4">
            Xóa tài khoản sẽ xóa email, tên, số điện thoại, sessions, và API keys vĩnh viễn.
            Đơn hàng được giữ lại cho mục đích kế toán (đã anonymized).
          </p>
          <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Đang xóa...' : 'Xóa tài khoản'}
          </Button>
        </div>
      </div>
    </div>
  )
}