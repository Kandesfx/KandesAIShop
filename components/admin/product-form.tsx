'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, Loader2, Image as ImageIcon, Sparkles, AlertCircle, Percent, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { slugify, formatVND } from '@/lib/format'
import { MediaPickerModal } from '@/components/admin/media-picker-modal'

interface Variant {
  name: string
  sku: string
  priceCents: string // VND (input string)
  salePriceCents?: string // VND
  durationDays?: number
  position: number
  isActive: boolean
}

export interface ProductMediaItem {
  url: string
  altText?: string
  position?: number
}

export interface ProductFormState {
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
  media: ProductMediaItem[]
  variants: Variant[]
}

interface Props {
  mode: 'create' | 'edit'
  categories: { id: string; name: string; slug: string }[]
  initial?: ProductFormState
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
  const [showMediaModal, setShowMediaModal] = useState(false)

  const [state, setState] = useState<ProductFormState>(
    initial ?? {
      categoryId: categories[0]?.id ?? '',
      name: '',
      slug: '',
      sku: '',
      shortDescription: '',
      description: '',
      priceCents: '0',
      salePriceCents: '',
      currency: 'VND',
      deliveryStrategy: 'INSTANT_AUTO',
      stockStatus: 'in_stock',
      trackInventory: true,
      isPublished: false,
      isFeatured: false,
      media: [],
      variants: [
        { name: 'Default', sku: '', priceCents: '0', salePriceCents: '', position: 0, isActive: true },
      ],
    }
  )

  const setField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
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
          salePriceCents: '',
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

  const addMedia = (item: { url: string; altText: string }) => {
    setState((s) => ({
      ...s,
      media: [...s.media, { url: item.url, altText: item.altText, position: s.media.length }],
    }))
  }

  const removeMedia = (idx: number) => {
    setState((s) => ({
      ...s,
      media: s.media.filter((_, i) => i !== idx),
    }))
  }

  const setPrimaryMedia = (idx: number) => {
    setState((s) => {
      const selected = s.media[idx]
      if (!selected) return s
      const rest = s.media.filter((_, i) => i !== idx)
      return {
        ...s,
        media: [selected, ...rest].map((m, i) => ({ ...m, position: i })),
      }
    })
  }

  // Calculate discount for main product
  const originalPrice = Number(state.priceCents) || 0
  const salePrice = state.salePriceCents ? Number(state.salePriceCents) : null
  const hasDiscount = salePrice !== null && salePrice > 0 && salePrice < originalPrice
  const discountPercent = hasDiscount ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0
  const discountSavings = hasDiscount ? originalPrice - salePrice : 0

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
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
        media: state.media.map((m, idx) => ({
          url: m.url,
          altText: m.altText || undefined,
          position: idx,
        })),
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
        router.push('/manage/products')
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
    <>
      <form onSubmit={onSubmit} className="space-y-6" aria-busy={busy}>
        {err && (
          <div
            role="alert"
            className="border border-danger/40 bg-danger/10 text-danger text-[13px] p-3 flex items-center gap-2"
          >
            <AlertCircle size={16} />
            <span>{err}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 01. Basic Info */}
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

          {/* 02. Pricing & Delivery */}
          <Section title="GIÁ GỐC, KHUYẾN MÃI & GIAO HÀNG" code="02">
            <div className="grid grid-cols-2 gap-3">
              <Field label="GIÁ GỐC (VND) *">
                <input
                  type="number"
                  required
                  min={0}
                  step={1000}
                  value={state.priceCents}
                  onChange={(e) => setField('priceCents', e.target.value)}
                  disabled={busy}
                  className="input mono disabled:opacity-50"
                  placeholder="50000"
                />
                {Number(state.priceCents) > 0 && (
                  <span className="text-[11px] font-mono text-ink-200 mt-1 block">
                    Gốc: {formatVND(state.priceCents)}
                  </span>
                )}
              </Field>

              <Field label="GIÁ ĐÃ GIẢM / SALE (VND)">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={state.salePriceCents ?? ''}
                  onChange={(e) => setField('salePriceCents', e.target.value)}
                  disabled={busy}
                  className="input mono disabled:opacity-50"
                  placeholder="Để trống nếu không sale"
                />
                {state.salePriceCents && Number(state.salePriceCents) > 0 ? (
                  <span className="text-[11px] font-mono text-electric font-semibold mt-1 block">
                    Bán: {formatVND(state.salePriceCents)}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-ink-200 mt-1 block">
                    (Không áp dụng giảm giá)
                  </span>
                )}
              </Field>
            </div>

            {/* Discount Summary Indicator */}
            {hasDiscount ? (
              <div className="p-3 bg-electric/10 border border-electric/40 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-sunset text-ink-900 font-mono font-bold text-[10px] rounded">
                    GIẢM {discountPercent}%
                  </span>
                  <span className="text-[12px] text-ink-50 font-medium">
                    Khách hàng tiết kiệm: <strong className="text-electric">{formatVND(discountSavings)}</strong>
                  </span>
                </div>
                <div className="text-[11px] font-mono text-ink-200">
                  <span className="line-through">{formatVND(originalPrice)}</span> &rarr; <span className="text-sunset font-bold">{formatVND(salePrice)}</span>
                </div>
              </div>
            ) : salePrice !== null && salePrice >= originalPrice && salePrice > 0 ? (
              <div className="p-2.5 bg-danger/10 border border-danger/30 rounded text-[11px] text-danger">
                ⚠️ Giá khuyến mãi ({formatVND(salePrice)}) phải nhỏ hơn giá gốc ({formatVND(originalPrice)})
              </div>
            ) : null}

            <Field label="HÌNH THỨC GIAO HÀNG">
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

            <Field label="TRẠNG THÁI KHO HÀNG">
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

        {/* 03. Media & Product Gallery */}
        <Section
          title="HÌNH ẢNH SẢN PHẨM"
          code="03"
          action={
            <button
              type="button"
              onClick={() => setShowMediaModal(true)}
              disabled={busy}
              className="text-[11px] font-mono uppercase text-electric hover:text-electric-hover inline-flex items-center gap-1.5 px-3 py-1 bg-electric/10 border border-electric/30 rounded"
            >
              <Sparkles size={13} /> CHỌN TỪ KHO ẢNH HỆ THỐNG
            </button>
          }
        >
          {state.media.length === 0 ? (
            <div
              onClick={() => setShowMediaModal(true)}
              className="border-2 border-dashed border-ink-400 bg-ink-900/50 hover:bg-ink-800/80 hover:border-electric/60 p-8 text-center cursor-pointer transition-all space-y-3"
            >
              <ImageIcon size={36} className="mx-auto text-ink-200" />
              <div className="space-y-1">
                <div className="text-[13px] font-semibold text-ink-50">
                  Chưa có hình ảnh cho sản phẩm này
                </div>
                <div className="text-[11px] text-ink-200">
                  Bấm vào đây để mở <strong>Kho ảnh AI hệ thống</strong> hoặc dán link ảnh tùy chỉnh
                </div>
              </div>
              <button
                type="button"
                className="px-4 py-1.5 bg-electric text-ink-900 font-mono text-[11px] font-bold uppercase rounded shadow"
              >
                + MỞ KHO ẢNH SẢN PHẨM
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {state.media.map((item, idx) => {
                  const isPrimary = idx === 0
                  return (
                    <div
                      key={idx}
                      className={`relative group bg-ink-900 border rounded overflow-hidden flex flex-col ${
                        isPrimary ? 'border-electric ring-1 ring-electric' : 'border-ink-400'
                      }`}
                    >
                      <div className="aspect-[4/3] bg-ink-950 flex items-center justify-center relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.altText || 'Product Media'}
                          className="w-full h-full object-cover"
                        />
                        {isPrimary && (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-mono font-bold bg-electric text-ink-900 uppercase rounded">
                            ẢNH CHÍNH
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(idx)}
                          className="absolute top-2 right-2 p-1 bg-ink-900/90 text-ink-100 hover:text-danger rounded transition-colors"
                          title="Xóa ảnh"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="p-2 space-y-1.5 bg-ink-900 text-[11px]">
                        <input
                          type="text"
                          value={item.altText || ''}
                          onChange={(e) => {
                            const newAlt = e.target.value
                            setState((s) => ({
                              ...s,
                              media: s.media.map((m, i) => (i === idx ? { ...m, altText: newAlt } : m)),
                            }))
                          }}
                          placeholder="Mô tả alt text..."
                          className="w-full px-2 py-1 bg-ink-800 border border-ink-400 text-[11px] text-ink-100 rounded focus:border-electric focus:outline-none"
                        />
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryMedia(idx)}
                            className="w-full py-1 text-[10px] font-mono uppercase bg-ink-800 hover:bg-electric hover:text-ink-900 text-ink-200 border border-ink-400 rounded transition-colors"
                          >
                            ĐẶT LÀM ẢNH ĐẠI DIỆN
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Add more button */}
                <div
                  onClick={() => setShowMediaModal(true)}
                  className="aspect-[4/3] border-2 border-dashed border-ink-400 bg-ink-900/40 hover:border-electric hover:bg-ink-800/60 rounded flex flex-col items-center justify-center cursor-pointer transition-colors p-4 text-center space-y-1"
                >
                  <Plus size={20} className="text-electric" />
                  <span className="text-[11px] font-mono uppercase text-ink-100">
                    THÊM ẢNH
                  </span>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* 04. Description */}
        <Section title="MÔ TẢ SẢN PHẨM" code="04">
          <Field label="MÔ TẢ NGẮN (≤ 280 ký tự)">
            <textarea
              value={state.shortDescription}
              onChange={(e) => setField('shortDescription', e.target.value)}
              disabled={busy}
              rows={2}
              maxLength={280}
              className="input disabled:opacity-50"
              placeholder="vd: Công cụ lập trình AI mạnh nhất hiện nay, tích hợp Claude 3.5 Sonnet & GPT-4o..."
            />
          </Field>
          <Field label="MÔ TẢ CHI TIẾT">
            <textarea
              value={state.description}
              onChange={(e) => setField('description', e.target.value)}
              disabled={busy}
              rows={6}
              className="input mono text-[12px] disabled:opacity-50"
              placeholder="Chi tiết tính năng, quyền lợi khi đăng ký, hướng dẫn cài đặt..."
            />
          </Field>
        </Section>

        {/* 05. Variants */}
        <Section
          title="GÓI SẢN PHẨM (VARIANTS) & GIÁ THEO GÓI"
          code="05"
          action={
            <button
              type="button"
              onClick={addVariant}
              disabled={busy}
              className="text-[11px] font-mono uppercase text-electric hover:text-electric-hover inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Plus size={12} /> THÊM GÓI MỚI
            </button>
          }
        >
          <div className="space-y-3">
            {state.variants.map((v, idx) => {
              const vPrice = Number(v.priceCents) || 0
              const vSale = v.salePriceCents ? Number(v.salePriceCents) : null
              const vHasSale = vSale !== null && vSale > 0 && vSale < vPrice
              const vDiscount = vHasSale ? Math.round(((vPrice - vSale) / vPrice) * 100) : 0

              return (
                <div key={idx} className="border border-ink-400 bg-ink-800 p-4 space-y-3 rounded">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
                        GÓI #{idx + 1}
                      </span>
                      {vHasSale && (
                        <span className="px-1.5 py-0.5 bg-sunset text-ink-900 font-mono font-bold text-[9px] rounded">
                          SALE -{vDiscount}%
                        </span>
                      )}
                    </div>
                    {state.variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        disabled={busy}
                        className="text-ink-100 hover:text-danger disabled:opacity-50"
                        aria-label="Xoá gói"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="TÊN GÓI">
                      <input
                        type="text"
                        placeholder="vd: 1 Tháng, 3 Tháng, 1 Năm"
                        required
                        value={v.name}
                        onChange={(e) => setVariant(idx, { name: e.target.value })}
                        disabled={busy}
                        className="input disabled:opacity-50"
                      />
                    </Field>
                    <Field label="SKU GÓI">
                      <input
                        type="text"
                        placeholder="CRS-PRO-1M"
                        required
                        value={v.sku}
                        onChange={(e) => setVariant(idx, { sku: e.target.value.toUpperCase() })}
                        disabled={busy}
                        className="input mono disabled:opacity-50"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="GIÁ GỐC (VND) *">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        required
                        value={v.priceCents}
                        onChange={(e) => setVariant(idx, { priceCents: e.target.value })}
                        disabled={busy}
                        className="input mono disabled:opacity-50"
                      />
                      {vPrice > 0 && (
                        <span className="text-[10px] font-mono text-ink-200 mt-1 block">
                          Gốc: {formatVND(vPrice)}
                        </span>
                      )}
                    </Field>

                    <Field label="GIÁ ĐÃ GIẢM / SALE (VND)">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={v.salePriceCents ?? ''}
                        onChange={(e) => setVariant(idx, { salePriceCents: e.target.value })}
                        disabled={busy}
                        className="input mono disabled:opacity-50"
                        placeholder="(tùy chọn)"
                      />
                      {vSale && vSale > 0 ? (
                        <span className="text-[10px] font-mono text-electric font-semibold mt-1 block">
                          Bán: {formatVND(vSale)}
                        </span>
                      ) : null}
                    </Field>

                    <Field label="SỐ NGÀY HIỆU LỰC">
                      <input
                        type="number"
                        min={1}
                        placeholder="vd: 30 (để trống nếu vĩnh viễn)"
                        value={v.durationDays ?? ''}
                        onChange={(e) =>
                          setVariant(idx, {
                            durationDays: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        disabled={busy}
                        className="input mono disabled:opacity-50"
                      />
                    </Field>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* 06. Flags & Visibility */}
        <Section title="HIỂN THỊ & SEO" code="06">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-ink-900 border border-ink-400 rounded cursor-pointer hover:border-ink-300">
              <input
                type="checkbox"
                checked={state.isPublished}
                onChange={(e) => setField('isPublished', e.target.checked)}
                disabled={busy}
                className="w-4 h-4 text-electric rounded"
              />
              <div>
                <div className="text-[13px] font-semibold text-ink-50">CÔNG KHAI SẢN PHẨM</div>
                <div className="text-[11px] text-ink-200">Hiển thị trên gian hàng cho khách mua</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-ink-900 border border-ink-400 rounded cursor-pointer hover:border-ink-300">
              <input
                type="checkbox"
                checked={state.isFeatured}
                onChange={(e) => setField('isFeatured', e.target.checked)}
                disabled={busy}
                className="w-4 h-4 text-electric rounded"
              />
              <div>
                <div className="text-[13px] font-semibold text-ink-50">SẢN PHẨM NỔI BẬT</div>
                <div className="text-[11px] text-ink-200">Ghim tại trang chủ và mục Đề xuất</div>
              </div>
            </label>
          </div>
        </Section>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-ink-400">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => router.back()}
          >
            HỦY BỎ
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy}
            aria-busy={busy}
            className="min-w-[140px]"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> ĐANG LƯU...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save size={14} /> {mode === 'create' ? 'TẠO SẢN PHẨM' : 'LƯU THAY ĐỔI'}
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={addMedia}
      />
    </>
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
    <div className="border border-ink-400 bg-ink-800 p-6 space-y-4 rounded">
      <div className="flex items-center justify-between border-b border-ink-400 pb-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-electric">
          [{code}] {title}
        </span>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
        {label}
      </span>
      {children}
    </label>
  )
}
