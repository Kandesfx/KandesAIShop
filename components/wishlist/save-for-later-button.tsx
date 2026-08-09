"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, X } from "lucide-react"
import { api, ApiError } from "@/lib/api-client"
import { Button } from "@/components/ui/button"

export interface SaveForLaterButtonProps {
  productId: string
  variantId?: string | null
  /** Nếu có, hiện như icon-only button (dùng trong cart item row). */
  compact?: boolean
  /** User đã đăng nhập hay chưa — quyết định hiện login prompt hay gọi API. */
  isLoggedIn: boolean
  /** Callback sau khi lưu thành công (VD: cart item gọi onRemove để xoá khỏi cart). */
  onSaved?: () => void
  className?: string
}

/**
 * Nút "Lưu lại sau" — Phase 9 D3.
 *
 * Guest (chưa đăng nhập): click hiện login prompt inline (không redirect
 * ngay, tránh mất context giữa chừng).
 * Đã đăng nhập: gọi POST /api/wishlist, thành công thì gọi onSaved().
 */
export function SaveForLaterButton({
  productId,
  variantId,
  compact = false,
  isLoggedIn,
  onSaved,
  className,
}: SaveForLaterButtonProps) {
  const pathname = usePathname()
  const [showPrompt, setShowPrompt] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleClick = async () => {
    if (!isLoggedIn) {
      setShowPrompt(true)
      return
    }

    setBusy(true)
    setError(null)
    try {
      await api.post("/api/wishlist", { productId, variantId: variantId ?? null })
      setSaved(true)
      onSaved?.()
    } catch (e) {
      const err = e as ApiError
      setError(err.message || "Không thể lưu sản phẩm")
    } finally {
      setBusy(false)
    }
  }

  if (showPrompt && !isLoggedIn) {
    return (
      <div
        role="status"
        className={
          "flex items-center gap-2 text-body-xs text-ink-200 border border-ink-400 bg-ink-800/60 px-2.5 py-1.5" +
          (className ? " " + className : "")
        }
      >
        <span>Đăng nhập để lưu sản phẩm này lại sau</span>
        <Link
          href={`/login?next=${encodeURIComponent(pathname || "/cart")}`}
          className="text-electric hover:underline whitespace-nowrap"
        >
          Đăng nhập
        </Link>
        <button
          type="button"
          onClick={() => setShowPrompt(false)}
          aria-label="Đóng"
          className="text-ink-300 hover:text-ink-50"
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || saved}
        aria-label={saved ? "Đã lưu vào wishlist" : "Lưu lại sau"}
        title={saved ? "Đã lưu vào wishlist" : "Lưu lại sau"}
        className={
          "p-1.5 transition-colors disabled:opacity-60" +
          " " +
          (saved ? "text-electric" : "text-ink-300 hover:text-electric") +
          (className ? " " + className : "")
        }
      >
        <Heart size={14} className={saved ? "fill-electric" : undefined} aria-hidden />
      </button>
    )
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={busy || saved}
        leftIcon={<Heart size={12} className={saved ? "fill-electric text-electric" : undefined} aria-hidden />}
      >
        {saved ? "ĐÃ LƯU" : "LƯU LẠI SAU"}
      </Button>
      {error && <p className="text-body-xs text-danger mt-1">{error}</p>}
    </div>
  )
}