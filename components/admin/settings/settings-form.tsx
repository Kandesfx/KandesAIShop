'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CategoryView } from '@/modules/settings'
import { SettingsField } from './settings-field'

interface Props {
  category: CategoryView
}

export function SettingsForm({ category }: Props) {
  const router = useRouter()
  const initialValues = useMemo(() => ({ ...category.values }), [category])
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...category.values }))
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const dirty = useMemo(() => {
    const allKeys = new Set([...Object.keys(initialValues), ...Object.keys(values)])
    for (const k of allKeys) {
      if (JSON.stringify(initialValues[k]) !== JSON.stringify(values[k])) {
        return true
      }
    }
    return false
  }, [initialValues, values])

  // Browser unload warning when dirty.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Next.js route change warning when dirty.
  const routerRef = useRef(router)
  routerRef.current = router
  useEffect(() => {
    if (!dirty) return
    const originalPush = routerRef.current.push
    const guardedPush = (href: string, ...rest: unknown[]) => {
      if (window.confirm('Bạn có thay đổi chưa lưu. Rời trang sẽ mất thay đổi.\n\nTiếp tục?')) {
        originalPush(href as never, ...(rest as never[]))
      }
    }
    routerRef.current.push = guardedPush as never
    return () => {
      routerRef.current.push = originalPush
    }
  }, [dirty])

  function setField(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }))
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSavedAt(null)

    try {
      const res = await fetch(`/api/admin/settings/${category.category}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      })
      const data = await res.json()
      if (!data.ok) {
        if (data.error?.fields) {
          const fe: Record<string, string[]> = {}
          for (const [k, v] of Object.entries(data.error.fields)) {
            fe[k] = Array.isArray(v) ? (v as string[]) : [String(v)]
          }
          setFieldErrors(fe)
        }
        setError(data.error?.message ?? 'Lỗi không xác định')
        return
      }
      setSavedAt(new Date().toLocaleTimeString('vi-VN'))
      // Cập nhật initialValues baseline → dirty = false
      // (sẽ được set lại khi router.refresh() load lại data)
      router.refresh()
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setValues({ ...initialValues })
    setFieldErrors({})
    setError(null)
    setSavedAt(null)
    setShowDiscardConfirm(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dirty state banner */}
      {dirty && (
        <div className="border border-warning/40 bg-warning/10 text-warning px-3 py-2 text-[11px] font-mono flex items-center justify-between">
          <span>● Có thay đổi chưa lưu</span>
          <button
            type="button"
            onClick={() => setShowDiscardConfirm(true)}
            className="text-warning hover:underline"
          >
            Huỷ thay đổi
          </button>
        </div>
      )}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-ink-800 border border-ink-400 p-6 max-w-sm w-full">
            <h3 className="text-[14px] font-display text-ink-50 mb-2">Huỷ thay đổi?</h3>
            <p className="text-[12px] text-ink-200 mb-4">
              Mọi thay đổi chưa lưu sẽ bị mất. Bạn chắc chắn?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="btn-outline text-[11px]"
              >
                Tiếp tục sửa
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="btn-primary text-[11px] bg-danger border-danger"
              >
                Huỷ thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {category.fields.map((field) => {
        const errs = fieldErrors[field.key]
        return (
          <div key={field.key} className="space-y-1.5">
            <label className="block text-[11px] font-mono uppercase tracking-wide text-ink-100">
              {field.label}
              {field.required && <span className="text-danger ml-1">*</span>}
              {field.sensitive && (
                <span className="ml-2 text-[9px] text-ink-200">[sensitive]</span>
              )}
              {field.envVar && (
                <span className="ml-2 text-[9px] text-electric">
                  env:{field.envVar}
                </span>
              )}
            </label>
            {field.description && field.type !== 'boolean' && (
              <p className="text-[10px] text-ink-200">{field.description}</p>
            )}
            <SettingsField
              field={field}
              value={(values[field.key] as never) ?? null}
              onChange={(v) => setField(field.key, v)}
            />
            {errs && (
              <ul className="text-[10px] text-danger space-y-0.5">
                {errs.map((msg, i) => (
                  <li key={i}>• {msg}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {error && (
        <div className="border border-danger bg-danger/10 px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      )}
      {savedAt && (
        <div className="border border-success bg-success/10 px-3 py-2 text-[11px] text-success">
          Đã lưu lúc {savedAt}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-ink-400">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="btn-outline text-[11px]"
          disabled={saving}
        >
          Reset
        </button>
        <button type="submit" className="btn-primary text-[11px]" disabled={saving || !dirty}>
          {saving ? 'Đang lưu...' : dirty ? 'Lưu thay đổi ●' : 'Đã lưu'}
        </button>
      </div>
    </form>
  )
}
