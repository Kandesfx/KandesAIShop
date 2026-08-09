"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, Trash2, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatVnd } from "@/lib/format"
import { api, ApiError } from "@/lib/api-client"
import { useCart } from "@/lib/cart-context"
import type { WishlistItemView } from "@/modules/wishlist/types"

export interface WishlistPageClientProps {
  initialItems: WishlistItemView[]
}

/**
 * D3: Wishlist page body — xoá item + "thêm vào giỏ" từ wishlist.
 * Server component (page.tsx) fetch initial data, component này quản lý
 * mutations client-side (giống pattern CartPageClient).
 */
export function WishlistPageClient({ initialItems }: WishlistPageClientProps) {
  const [items, setItems] = useState(initialItems)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { upsertItem } = useCart()

  const handleRemove = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.delete(`/api/wishlist/${id}`)
      setItems((prev) => prev.filter((it) => it.id !== id))
    } catch (e) {
      setError((e as ApiError).message || "Không thể xoá item")
    } finally {
      setBusyId(null)
    }
  }

  const handleAddToCart = async (item: WishlistItemView) => {
    setBusyId(item.id)
    setError(null)
    try {
      await upsertItem({ productId: item.productId, variantId: item.variantId, quantity: 1 })
      await api.delete(`/api/wishlist/${item.id}`)
      setItems((prev) => prev.filter((it) => it.id !== item.id))
    } catch (e) {
      setError((e as ApiError).message || "Không thể thêm vào giỏ")
    } finally {
      setBusyId(null)
    }
  }

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center space-y-3">
        <Heart size={48} className="mx-auto text-ink-300" aria-hidden />
        <p className="text-body font-display text-ink-100">Chưa có sản phẩm nào được lưu</p>
        <p className="text-body-sm text-ink-200">
          Bấm &ldquo;Lưu lại sau&rdquo; trên trang giỏ hàng hoặc trang sản phẩm để lưu lại xem sau.
        </p>
        <Link href="/products" className="inline-block mt-2 text-electric hover:underline text-body-sm">
          Xem sản phẩm &rarr;
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="border border-danger/40 bg-danger/10 text-danger text-body-sm p-2.5">
          {error}
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex gap-3 p-3 border border-ink-700 bg-ink-900">
          <Link
            href={`/products/${item.productSlug}`}
            className="relative w-20 h-20 bg-ink-800 flex-shrink-0 overflow-hidden"
          >
            {item.productImage ? (
              <Image src={item.productImage} alt={item.productName} fill sizes="80px" className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-ink-500 text-body-xs">
                No image
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0 flex flex-col">
            <Link
              href={`/products/${item.productSlug}`}
              className="text-body-sm font-medium text-ink-50 hover:text-electric line-clamp-2"
            >
              {item.productName}
            </Link>
            {item.variantName && (
              <p className="text-body-xs text-ink-300 mt-0.5">Phân loại: {item.variantName}</p>
            )}
            {!item.isPublished && (
              <p className="text-body-xs text-danger mt-0.5">Sản phẩm hiện không còn bán</p>
            )}

            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              <div className="text-body-sm font-semibold text-ink-50 tabular-nums">
                {formatVnd(BigInt(item.unitPriceCents))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleAddToCart(item)}
                  disabled={busyId === item.id || !item.isPublished}
                  leftIcon={<ShoppingCart size={12} aria-hidden />}
                >
                  Thêm vào giỏ
                </Button>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  disabled={busyId === item.id}
                  aria-label="Xoá khỏi wishlist"
                  className="p-1.5 text-ink-300 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}