'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  ttl: number
}

interface ToastContextValue {
  toast: (message: string, opts?: { variant?: ToastVariant; ttl?: number }) => void
  success: (message: string, ttl?: number) => void
  error: (message: string, ttl?: number) => void
  info: (message: string, ttl?: number) => void
  warning: (message: string, ttl?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** Provider — gắn ở root layout hoặc (manage)/layout.tsx. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
    const t = timersRef.current.get(id)
    if (t) {
      clearTimeout(t)
      timersRef.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (message: string, variantOrOpts?: ToastVariant | { variant?: ToastVariant; ttl?: number }, ttlOrOverride?: number) => {
      let variant: ToastVariant = 'info'
      let ttl = 3500
      if (typeof variantOrOpts === 'string') {
        variant = variantOrOpts
        if (typeof ttlOrOverride === 'number') ttl = ttlOrOverride
      } else if (variantOrOpts) {
        if (variantOrOpts.variant) variant = variantOrOpts.variant
        if (typeof variantOrOpts.ttl === 'number') ttl = variantOrOpts.ttl
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setItems((prev) => [...prev, { id, message, variant, ttl }])
      const handle = setTimeout(() => dismiss(id), ttl)
      timersRef.current.set(id, handle)
    },
    [dismiss]
  )

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (m, ttl) => push(m, 'success', ttl),
      error: (m, ttl) => push(m, 'error', ttl ?? 5000),
      info: (m, ttl) => push(m, 'info', ttl),
      warning: (m, ttl) => push(m, 'warning', ttl),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const variantClass =
    item.variant === 'success'
      ? 'border-success/40 bg-success/10 text-success'
      : item.variant === 'error'
        ? 'border-danger/40 bg-danger/10 text-danger'
        : item.variant === 'warning'
          ? 'border-warning/40 bg-warning/10 text-warning'
          : 'border-electric/40 bg-electric/10 text-electric'

  return (
    <div
      role="status"
      className={`pointer-events-auto min-w-[260px] max-w-sm border px-4 py-3 shadow-lg backdrop-blur-sm ${variantClass}`}
      onClick={onDismiss}
    >
      <p className="text-[12px] font-mono leading-relaxed">{item.message}</p>
    </div>
  )
}

/** Hook — dùng trong client components. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback no-op khi provider chưa mount (tránh crash).
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    }
  }
  return ctx
}
