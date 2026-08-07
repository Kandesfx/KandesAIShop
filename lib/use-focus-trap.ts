import { useEffect, useRef, type RefObject } from 'react'

/**
 * Focus trap — keeps focus within a container.
 *
 * Usage:
 *   const ref = useFocusTrap(isActive)
 *   <div ref={ref} tabIndex={-1}>...</div>
 *
 * On activate: stores activeElement + focuses first focusable child.
 * Tab/Shift+Tab cycle within container.
 * On deactivate: restores focus to stored element.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean
): RefObject<T> {
  const ref = useRef<T>(null)
  const prevFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!active || !ref.current) return

    const el = ref.current
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

    const focusable = Array.from(
      el.querySelectorAll<HTMLElement>(focusableSelector)
    ).filter((node) => !node.hasAttribute('disabled'))

    if (focusable.length === 0) return

    // Store previously focused element
    prevFocusRef.current = document.activeElement

    // Focus first element
    focusable[0]!.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const current = Array.from(
        el.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((node) => !node.hasAttribute('disabled'))

      if (current.length === 0) return

      const first = current[0]!
      const last = current[current.length - 1]!

      if (e.shiftKey) {
        // Shift+Tab: if on first, wrap to last
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab: if on last, wrap to first
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [active])

  // Restore focus on close
  useEffect(() => {
    if (active) return
    if (prevFocusRef.current instanceof HTMLElement) {
      prevFocusRef.current.focus()
      prevFocusRef.current = null
    }
  }, [active])

  return ref
}
