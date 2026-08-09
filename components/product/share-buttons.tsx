'use client'

import { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'

interface ShareButtonsProps {
  productName: string
  url: string
}

/**
 * ShareButtons — Phase 9 D4.
 *
 * navigator.share() API cho mobile (native share sheet), fallback dropdown
 * với Facebook / Twitter (X) / Copy link cho desktop hoặc browser không hỗ trợ.
 */
export function ShareButtons({ productName, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: productName, url })
        return
      } catch {
        // User cancelled hoặc lỗi — fallback dropdown
      }
    }
    setMenuOpen((v) => !v)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
    setMenuOpen(false)
  }

  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(productName)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleNativeShare}
        className="btn-outline text-[11px]"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <Share2 size={14} strokeWidth={1.5} aria-hidden />
        Chia sẻ
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-20 w-48 border border-ink-400 bg-ink-800 shadow-lg"
        >
          <a
            role="menuitem"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2.5 text-[13px] text-ink-100 hover:bg-ink-700 hover:text-electric transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Facebook
          </a>
          <a
            role="menuitem"
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2.5 text-[13px] text-ink-100 hover:bg-ink-700 hover:text-electric transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Twitter / X
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-ink-100 hover:bg-ink-700 hover:text-electric transition-colors text-left"
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={1.5} aria-hidden />
                Đã copy!
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={1.5} aria-hidden />
                Copy link
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}