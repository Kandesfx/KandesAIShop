import { Check } from 'lucide-react'
import { clsx } from 'clsx'

export type CheckoutStep = 'cart' | 'payment' | 'done'

const STEPS: { key: CheckoutStep; label: string }[] = [
  { key: 'cart', label: 'Giỏ hàng' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'done', label: 'Hoàn tất' },
]

export interface CheckoutTimelineProps {
  /** Bước hiện tại — các bước trước đó hiển thị "đã hoàn thành" (check icon). */
  current: CheckoutStep
  className?: string
}

/**
 * CheckoutTimeline — Phase 9 D7.
 *
 * Stepper 3 bước: Giỏ hàng → Thanh toán → Hoàn tất.
 * - Responsive: horizontal ở desktop, vẫn horizontal (compact) ở mobile vì
 *   chỉ có 3 bước — dùng flex-wrap + smaller label trên mobile qua text-body-xs.
 * - `aria-current="step"` cho bước hiện tại (SR announce đúng vị trí).
 */
export function CheckoutTimeline({ current, className }: CheckoutTimelineProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <ol className={clsx('flex items-center gap-1.5 sm:gap-2', className)} aria-label="Tiến trình đặt hàng">
      {STEPS.map((step, i) => {
        const isDone = current === 'done' ? i <= currentIndex : i < currentIndex
        const isCurrent = current !== 'done' && i === currentIndex
        return (
          <li key={step.key} className="flex items-center gap-1.5 sm:gap-2 flex-1 last:flex-none">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={clsx(
                  'flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border text-[11px] font-mono flex-shrink-0 transition-colors duration-fast',
                  isDone
                    ? current === 'done'
                      ? 'bg-emerald-400 border-emerald-400 text-ink-950 shadow-sm shadow-emerald-400/25 font-bold'
                      : 'bg-electric border-electric text-ink-900 font-bold'
                    : isCurrent
                      ? 'border-electric text-electric font-semibold'
                      : 'border-ink-400 text-ink-300'
                )}
              >
                {isDone ? <Check size={13} strokeWidth={2.5} aria-hidden /> : i + 1}
              </span>
              <span
                className={clsx(
                  'text-body-xs sm:text-body-sm whitespace-nowrap',
                  current === 'done' && isDone
                    ? 'text-emerald-400 font-semibold'
                    : isCurrent
                      ? 'text-ink-50 font-semibold'
                      : isDone
                        ? 'text-ink-100'
                        : 'text-ink-300'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={clsx(
                  'h-px flex-1 min-w-[16px] transition-colors duration-fast',
                  isDone ? (current === 'done' ? 'bg-emerald-400' : 'bg-electric') : 'bg-ink-400'
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
