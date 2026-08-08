import { useEffect, useRef } from 'react'

/**
 * useFocusTrap — trap keyboard focus inside a container (dialog, drawer, modal).
 *
 * Usage:
 * ```tsx
 * const ref = useFocusTrap<HTMLDivElement>(open)
 * return <div ref={ref}>...</div>
 * ```
 *
 * - Tab cycles qua focusable elements trong container.
 * - Shift+Tab ngược.
 * - Restore focus to trigger element on unmount.
 *
 * @param active - Whether trap is active
 * @returns ref to attach to container element
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const containerRef = useRef<T>(null)
  const previousActiveElementRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    // Save previously focused element
    previousActiveElementRef.current = document.activeElement

    // Focus first focusable element
    const focusable = getFocusableElements(container)
    if (focusable.length > 0) {
      ;(focusable[0] as HTMLElement).focus()
    }

    // Trap Tab/Shift+Tab
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = getFocusableElements(container)
      if (focusable.length === 0) return

      const firstEl = focusable[0] as HTMLElement
      const lastEl = focusable[focusable.length - 1] as HTMLElement
      const activeEl = document.activeElement

      if (e.shiftKey) {
        // Shift+Tab on first → wrap to last
        if (activeEl === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        // Tab on last → wrap to first
        if (activeEl === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    container.addEventListener('keydown', onKeyDown)

    return () => {
      container.removeEventListener('keydown', onKeyDown)

      // Restore focus
      if (previousActiveElementRef.current instanceof HTMLElement) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [active])

  return containerRef
}

/**
 * Get all focusable elements within a container.
 */
function getFocusableElements(container: HTMLElement): Element[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  return Array.from(container.querySelectorAll(selector)).filter((el) => {
    // Filter out hidden elements
    if (el instanceof HTMLElement) {
      const style = getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    }
    return true
  })
}
