'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { slugify } from '@/lib/format'

interface Variant {
  name: string
  sku: string
  priceCents: string // VND (input string)
  salePriceCents?: string // VND
  durationDays?: number
  position: number
  isActive: boolean
}

interface FormState {
  id?: string
  categoryId: string
  name: string
  slug: string
  sku: string
  shortDescription: string
  description: string
  priceCents: string // VND (input string)
  salePriceCents?: string // VND
  currency: string
  deliveryStrategy: string
  stockStatus: string
  trackInventory: boolean
  isPublished: boolean
  isFeatured: boolean
  seoTitle?: string
  seoDescription?: string
  variants: Variant[]
}

interface Props {
  mode: 'create' | 'edit'
  categories: { id: string; name: string; slug: string }[]
  initial?: FormState
}

const DELIVERY_OPTIONS = [
  { value: 'INSTANT_AUTO', label: 'Giao tự động' },
  { value: 'MANUAL_KEY', label: 'Key thủ công' },
  { value: 'MANUAL_MESSAGE', label: 'Tin nhắn thủ công' },
  { value: 'FILE_DOWNLOAD', label: 'Tải file' },
  { value: 'TOPUP', label: 'Nạp credit' },
  { value: 'EXTERNAL_INVITE', label: 'Mời ngoài' },
]

const STOCK_OPTIONS = [
  { value: 'in_stock', label: 'Còn hàng' },
  { value: 'out_of_stock', label: 'Hết hàng' },
  { value: 'preorder', label: 'Đặt trước' },
]

export function ProductForm({ mode, categories, initial }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [state, setState] = useState<FormState>(
    initial ?? {
      categoryId: categories[0]?.id ?? '',
      name: '',
      slug: '',
      sku: '',
      shortDescription: '',
      description: '',
      priceCents: '0',
      currency: 'VND',
      deliveryStrategy: 'INSTANT_AUTO',
      stockStatus: 'in_stock',
      trackInventory: true,
      isPublished: false,
      isFeatured: false,
      variants: [
        { name: 'Default', sku: '', priceCents: '0', position: 0, isActive: true },
      ],
    }
  )

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }))
  }

  const autoSlug = () => {
    if (!state.slug || state.slug === slugify(state.name)) {
      setField('slug', slugify(state.name))
    }
  }

  const setVariant = (idx: number, patch: Partial<Variant>) => {
    setState((s) => ({
      ...s,
      variants: s.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }))
  }

  const addVariant = () => {
    setState((s) => ({
      ...s,
      variants: [
        ...s.variants,
        {
          name: '',
          sku: '',
          priceCents: '0',
          position: s.variants.length,
          isActive: true,
        },
      ],
    }))
  }

  const removeVariant = (idx: number) => {
    setState((s) => ({
      ...s,
      variants: s.variants.filter((_, i) => i !== idx),
    }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      // Gửi nguyên VND string → backend bigintFromNumber transform
      const body = {
        categoryId: state.categoryId,
        name: state.name,
        slug: state.slug,
        sku: state.sku,
        shortDescription: state.shortDescription || undefined,
        description: state.description || undefined,
        priceCents: state.priceCents,
        salePriceCents: state.salePriceCents || undefined,
        currency: state.currency,
        deliveryStrategy: state.deliveryStrategy,
        stockStatus: state.stockStatus,
        trackInventory: state.trackInventory,
        isPublished: state.isPublished,
        isFeatured: state.isFeatured,
        seoTitle: state.seoTitle || undefined,
        seoDescription: state.seoDescription || undefined,
        variants: state.variants.map((v) => ({
          name: v.name,
          sku: v.sku,
          priceCents: v.priceCents,
          salePriceCents: v.salePriceCents || undefined,
          durationDays: v.durationDays,
          position: v.position,
          isActive: v.isActive,
        })),
      }

      if (mode === 'create') {
        await api.post('/api/admin/products', body)
        router.push('/admin/products')
      } else if (state.id) {
        await api.patch(`/api/admin/products/${state.id}`, body)
        router.refresh()
      }
    } catch (e) {
      const error = e as Error & { fields?: { field: string; message: string }[] }
      if (error.fields && error.fields.length > 0) {
        setErr(error.fields.map((f) => `${f.field}: ${f.message}`).join('; '))
      } else {
        setErr(error.message || 'Lỗi không xác định')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" aria-busy={busy}>
      {err && (
        <div
          role="alert"
          className="border border-danger/40 bg-danger/10 text-danger text-[13px] p-3"
        >
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic */}
        <Section title="THÔNG TIN CƠ BẢN" code="01">
          <Field label="TÊN SẢN PHẨM">
            <input
              type="text"
              required
              value={state.name}
              onChange={(e) => setField('name', e.target.value)}
              onBlur={autoSlug}
              disabled={busy}
              className="input disabled:opacity-50"
              placeholder="vd: Cursor Pro 1 Tháng"
            />
          </Field>
          <Field label="SLUG (URL)">
            <input
              type="text"
              required
              value={state.slug}
              onChange={(e) => setField('slug', e.target.value)}
              disabled={busy}
              className="input mono disabled:opacity-50"
              placeholder="vd: cursor-pro"
            />
          </Field>
          <Field label="SKU">
            <input
              type="text"
              required
              value={state.sku}
              onChange={(e) => setField('sku', e.target.value.toUpperCase())}
              disabled={busy}
              className="input mono disabled:opacity-50"
              placeholder="CRS-PRO-1M"
            />
          </Field>
          <Field label="DANH MỤC">
            <select
              required
              value={state.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
              disabled={busy}
              className="input disabled:opacity-50"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Pricing & delivery */}
        <Section title="GIÁ & GIAO HÀNG" code="02">
          <div className="grid grid-cols-2 gap-3">
            <Field label="GIÁ (VND)">
              <input
                type="number"
                required
                min={0}
                step={1000}
                value={state.priceCents}
                onChange={(e) => setField('priceCents', e.target.value)}
                disabled={busy}
                className="input mono disabled:opacity-50"
              />
              {Number(state.priceCents) > 0 && (
                <span className="text-[10px] font-mono text-ink-200 mt-1 block">
                  ≈ {Number(state.priceCents).toLocaleString('vi-VN')} ₫
                </span>
              )}
              {mode === 'edit' && initial && (
                <span className="text-[10px] font-mono text-ink-200 mt-1 block">
                  DB đang lưu: {Number(initial.priceCents).toLocaleString('vi-VN')} ₫
                </span>
              )}
            </Field>
            <Field label="GIẢM GIÁ (VND)">
              <input
                type="number"
                min={0}
                step={1000}
                value={state.salePriceCents ?? ''}
                onChange={(e) => setField('salePriceCents', e.target.value)}
                disabled={busy}
                className="input mono disabled:opacity-50"
                placeholder="(tuỳ chọn)"
              />
            </Field>
          </div>
          <Field label="DELIVERY STRATEGY">
            <select
              value={state.deliveryStrategy}
              onChange={(e) => setField('deliveryStrategy', e.target.value)}
              disabled={busy}
              className="input disabled:opacity-50"
            >
              {DELIVERY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="TRẠNG THÁI KHO">
            <select
              value={state.stockStatus}
              onChange={(e) => setField('stockStatus', e.target.value)}
              disabled={busy}
              className="input disabled:opacity-50"
            >
              {STOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </Section>
      </div>

      {/* Description */}
      <Section title="MÔ TẢ" code="03">
        <Field label="MÔ TẢ NGẮN (≤ 280 ký tự)">
          <textarea
            value={state.shortDescription}
            onChange={(e) => setField('shortDescription', e.target.value)}
            disabled={busy}
            rows={2}
            maxLength={280}
            className="input disabled:opacity-50"
          />
        </Field>
        <Field label="MÔ TẢ CHI TIẾT">
          <textarea
            value={state.description}
            onChange={(e) => setField('description', e.target.value)}
            disabled={busy}
            rows={6}
            className="input mono text-[12px] disabled:opacity-50"
          />
        </Field>
      </Section>

      {/* Variants */}
      <Section
        title="GÓI SẢN PHẨM"
        code="04"
        action={
          <button
            type="button"
            onClick={addVariant}
            disabled={busy}
            className="text-[11px] font-mono uppercase text-electric hover:text-electric-hover inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus size={12} /> THÊM GÓI
          </button>
        }
      >
        <div className="space-y-3">
          {state.variants.map((v, idx) => (
            <div key={idx} className="border border-ink-400 bg-ink-800 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
                  GÓI #{idx + 1}
                </span>
                {state.variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    disabled={busy}
                    className="text-ink-100 hover:text-danger disabled:opacity-50"
                    aria-label="Xoá gói"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Tên gói (vd: 1 Tháng, 3 Tháng)"
                  required
                  value={v.name}
                  onChange={(e) => setVariant(idx, { name: e.target.value })}
                  disabled={busy}
                  className="input disabled:opacity-50"
                />
                <input
                  type="text"
                  placeholder="SKU"
                  required
                  value={v.sku}
                  onChange={(e) => setVariant(idx, { sku: e.target.value.toUpperCase() })}
                  disabled={busy}
                  className="input mono disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Giá (VND)"
                  required
                  min={0}
                  step={1000}
                  value={v.priceCents}
                  onChange={(e) => setVariant(idx, { priceCents: e.target.value })}
                  disabled={busy}
                  className="input mono disabled:opacity-50"
                />
                <input
                  type="number"
                  placeholder="Giảm giá (VND)"
                  min={0}
                  step={1000}
                  value={v.salePriceCents ?? ''}
                  onChange={(e) => setVariant(idx, { salePriceCents: e.target.value })}
                  disabled={busy}
                  className="input mono disabled:opacity-50"
                />
                <input
                  type="number"
                  placeholder="Số ngày (vd: 30)"
                  min={1}
                  value={v.durationDays ?? ''}
                  onChange={(e) =>
                    setVariant(idx, {
                      durationDays: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  disabled={busy}
                  className="input mono disabled:opacity-50"
                />
              </div>
              <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={v.isActive}
                  onChange={(e) => setVariant(idx, { isActive: e.target.checked })}
                  disabled={busy}
                  className="w-4 h-4 accent-electric"
                />
                <span className="text-ink-100">Đang bán</span>
              </label>
            </div>
          ))}
        </div>
      </Section>

      {/* Settings */}
      <Section title="THIẾT LẬP" code="05">
        <div className="grid grid-cols-2 gap-3">
          <CheckField
            label="ĐÃ XUẤT BẢN"
            hint="Hiển thị trên trang public"
            checked={state.isPublished}
            onChange={(v) => setField('isPublished', v)}
            disabled={busy}
          />
          <CheckField
            label="SẢN PHẨM NỔI BẬT"
            hint="Hiển thị ở homepage"
            checked={state.isFeatured}
            onChange={(v) => setField('isFeatured', v)}
            disabled={busy}
          />
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-ink-400">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost text-[11px]"
          disabled={busy}
        >
          Huỷ
        </button>
        <Button type="submit" isLoading={busy} leftIcon={<Save size={14} strokeWidth={2} />}>
          {mode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
        </Button>
      </div>
    </form>
  )
}

function Section({
  title,
  code,
  action,
  children,
}: {
  title: string
  code: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border border-ink-400 bg-ink-800/40">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-400">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-electric">
          [{code}] {title}
        </span>
        {action}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
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

function CheckField({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer p-3 border border-ink-400 bg-ink-800/30 hover:border-electric/40 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 w-4 h-4 accent-electric"
      />
      <div>
        <div className="text-[12px] font-medium text-ink-50">{label}</div>
        <div className="text-[10px] text-ink-200">{hint}</div>
      </div>
    </label>
  )
}
