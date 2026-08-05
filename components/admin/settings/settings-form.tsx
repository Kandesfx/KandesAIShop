'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CategoryView } from '@/modules/settings'
import { SettingsField } from './settings-field'

interface Props {
  category: CategoryView
}

export function SettingsForm({ category }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, unknown>>(
    () => ({ ...category.values })
  )
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

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
      // Refresh server component để reload default values.
      router.refresh()
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <button type="submit" className="btn-primary text-[11px]" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  )
}
