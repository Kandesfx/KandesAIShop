'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { api, ApiError } from '@/lib/api-client'
import type { CartView } from '@/modules/cart'

/* ── Types ─────────────────────────────────────────────── */

type CartAction =
  | { type: 'SET'; cart: CartView }
  | { type: 'UPSERT'; cart: CartView }
  | { type: 'CLEAR'; cart: CartView }

interface CartState {
  cart: CartView | null
  loading: boolean
  error: string | null
}

interface CartContextValue extends CartState {
  refresh: () => Promise<void>
  upsertItem: (item: { productId: string; variantId?: string | null; quantity: number }) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
}

/* ── Reducer ───────────────────────────────────────────── */

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET':
      return { ...state, cart: action.cart, loading: false, error: null }
    case 'UPSERT':
      return { ...state, cart: action.cart, loading: false, error: null }
    case 'CLEAR':
      return { ...state, cart: action.cart, loading: false, error: null }
    default:
      return state
  }
}

/* ── Context ────────────────────────────────────────────── */

const CartContext = createContext<CartContextValue | null>(null)

/* ── Provider ───────────────────────────────────────────── */

/**
 * CartProvider — single source of truth cho cart state.
 *
 * Mount ở `app/layout.tsx` (server component), fetch initial cart server-side
 * để tránh hydration mismatch. Tất cả cart consumers (CartButton, CartDrawer,
 * CartPageClient) dùng `useCart()` thay vì local state hoặc custom events.
 *
 * Mutations dispatch reducer action → tất cả consumers cùng re-render.
 * No polling, no custom events.
 */
export function CartProvider({
  children,
  initialCart,
}: {
  children: ReactNode
  initialCart: CartView | null
}) {
  const [{ cart, loading, error }, dispatch] = useReducer(cartReducer, {
    cart: initialCart,
    loading: initialCart === undefined,
    error: null,
  })

  // Ref để tránh re-fetch khi đã có initialCart từ server
  const fetchedRef = useRef(false)
  if (initialCart && !fetchedRef.current) {
    fetchedRef.current = true
  }

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ cart: CartView }>('/api/cart')
      dispatch({ type: 'SET', cart: res.cart })
    } catch (e) {
      // Cart có thể rỗng — không hiển thị lỗi global
      const err = e as ApiError
      if (err.code !== 'UNAUTHORIZED') {
        console.warn('[cart] refresh failed:', err.message)
      }
    }
  }, [])

  const upsertItem = useCallback(
    async (item: { productId: string; variantId?: string | null; quantity: number }) => {
      const res = await api.post<{ cart: CartView }>('/api/cart/items', item)
      dispatch({ type: 'UPSERT', cart: res.cart })
    },
    []
  )

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    const res = await api.patch<{ cart: CartView }>(`/api/cart/items/${itemId}`, {
      quantity,
    })
    dispatch({ type: 'UPSERT', cart: res.cart })
  }, [])

  const removeItem = useCallback(async (itemId: string) => {
    const res = await api.delete<{ cart: CartView }>(`/api/cart/items/${itemId}`)
    dispatch({ type: 'UPSERT', cart: res.cart })
  }, [])

  const clearCart = useCallback(async () => {
    const res = await api.post<{ cart: CartView }>('/api/cart/clear', {})
    dispatch({ type: 'CLEAR', cart: res.cart })
  }, [])

  // Fetch cart khi mount mà không có initialCart (CSR-only path)
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      void refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <CartContext.Provider value={{ cart, loading, error, refresh, upsertItem, updateItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

/* ── Hooks ──────────────────────────────────────────────── */

/**
 * Read cart state + mutation actions.
 * Throw nếu dùng ngoài CartProvider.
 */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used inside <CartProvider>')
  }
  return ctx
}
