import { requireUser } from '@/lib/auth'
import { wishlistService } from '@/modules/wishlist'
import { WishlistPageClient } from '@/components/wishlist/wishlist-page-client'
import type { WishlistItemView } from '@/modules/wishlist/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Đã lưu · Kandes.shop',
}

/**
 * /account/wishlist — Phase 9 D3.
 *
 * Server component fetch initial wishlist, WishlistPageClient quản lý
 * mutations (remove / add-to-cart) client-side.
 */
export default async function WishlistPage() {
  let user
  try {
    user = await requireUser()
  } catch {
    user = null
  }
  if (!user) return null

  let items: WishlistItemView[] = []
  try {
    items = await wishlistService.listWishlist(user.id)
  } catch {
    items = []
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2 pb-6 border-b border-ink-400">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ACCOUNT · WISHLIST ]
        </span>
        <h1 className="text-display-lg font-display">
          Đã lưu<span className="text-electric">.</span>
        </h1>
        <p className="text-body-sm text-ink-100">
          {items.length} sản phẩm đã lưu lại
        </p>
      </header>

      <WishlistPageClient initialItems={items} />
    </div>
  )
}