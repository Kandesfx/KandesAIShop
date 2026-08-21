'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { slugify } from '@/lib/format'

export function CategoryForm({
  mode,
  parents,
  initial,
}: {
  mode: 'create' | 'edit'
  parents: { id: string; name: string }[]
  initial?: { id: string; name: string; slug: string; parentId?: string | null; isActive: boolean; position: number; description?: string }
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [parentId, setParentId] = useState(initial?.parentId ?? '')
  const [position, setPosition] = useState(initial?.position ?? 0)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [description, setDescription] = useState(initial?.description ?? '')

  const autoSlug = () => {
    if (!slug || slug === slugify(name)) setSlug(slugify(name))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const body = {
        name,
        slug,
        parentId: parentId || undefined,
        position,
        isActive,
        description: description || undefined,
      }
      if (mode === 'create') {
        await api.post('/api/admin/categories', body)
        router.push('/manage/categories')
      } else if (initial?.id) {
        await api.patch(`/api/admin/categories/${initial.id}`, body)
        router.refresh()
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {err && (
        <div className="border border-danger/40 bg-danger/10 text-danger text-[13px] p-3">{err}</div>
      )}

      <Field label="TÊN DANH MỤC">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={autoSlug}
          className="input"
        />
      </Field>
      <Field label="SLUG (URL)">
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="input mono"
        />
      </Field>
      <Field label="MÔ TẢ">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="DANH MỤC CHA (nếu có)">
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="input"
          >
            <option value="">— Không có —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="VỊ TRÍ (số)">
          <input
            type="number"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            className="input mono"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-[13px] cursor-pointer p-3 border border-ink-400 bg-ink-800/30">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-electric"
        />
        Đang hoạt động
      </label>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-ink-400">
        <button type="button" onClick={() => router.back()} className="btn-ghost text-[12px]" disabled={busy}>
          Huỷ
        </button>
        <Button type="submit" isLoading={busy} leftIcon={<Save size={14} strokeWidth={2} />}>
          {mode === 'create' ? 'Tạo danh mục' : 'Lưu'}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}
