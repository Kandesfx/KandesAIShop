'use client'

import { useState } from 'react'
import type { SettingFieldDef } from '@/modules/settings'

interface Props {
  field: SettingFieldDef
  value: string | number | boolean | string[] | null
  onChange: (value: string | number | boolean | string[]) => void
}

/**
 * Settings field renderer — P4-06.
 * Switch theo field.type, tự cast value khi change.
 */
export function SettingsField({ field, value, onChange }: Props) {
  const baseInputClass =
    'input-field w-full text-[12px] disabled:opacity-50 disabled:cursor-not-allowed'

  // Disabled khi sensitive + envVar + giá trị trống → "managed by env".
  const envManaged = !!field.envVar && field.sensitive

  switch (field.type) {
    case 'text':
    case 'email':
    case 'url':
      return (
        <input
          type={
            field.type === 'email'
              ? 'email'
              : field.type === 'url'
                ? 'url'
                : 'text'
          }
          value={(value as string | null) ?? ''}
          maxLength={field.maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description ?? ''}
          className={baseInputClass}
          disabled={envManaged}
        />
      )

    case 'textarea':
      return (
        <textarea
          value={(value as string | null) ?? ''}
          maxLength={field.maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description ?? ''}
          rows={3}
          className={baseInputClass}
          disabled={envManaged}
        />
      )

    case 'password':
      return (
        <PasswordField
          value={String((value as string | null) ?? '')}
          envManaged={Boolean(envManaged)}
          onChange={onChange}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          value={value !== null && value !== undefined ? Number(value) : ''}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange(Number(e.target.value))}
          className={baseInputClass}
          disabled={envManaged}
        />
      )

    case 'boolean':
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 accent-electric"
          />
          <span className="text-[11px] text-ink-200">{field.description ?? 'Bật/Tắt'}</span>
        </label>
      )

    case 'select':
      return (
        <select
          value={(value as string | null) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
          disabled={envManaged}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => {
            const checked = selected.includes(opt)
            return (
              <label
                key={opt}
                className="inline-flex items-center gap-1.5 px-2 py-1 border border-ink-400 bg-ink-800/40 text-[11px] cursor-pointer hover:border-electric"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selected.filter((s) => s !== opt)
                      : [...selected, opt]
                    onChange(next)
                  }}
                  className="w-3 h-3 accent-electric"
                />
                <span>{opt}</span>
              </label>
            )
          })}
        </div>
      )
    }
  }
}

function PasswordField({
  value,
  envManaged,
  onChange,
}: {
  value: string
  envManaged: boolean
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex gap-2">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          envManaged
            ? '(Quản lý qua env var — chỉ hiển thị trạng thái)'
            : 'Để trống nếu không đổi'
        }
        className="input-field flex-1 text-[12px] disabled:opacity-50"
        disabled={envManaged}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="btn-outline text-[10px] px-2"
      >
        {show ? 'Ẩn' : 'Hiện'}
      </button>
    </div>
  )
}
