'use client'

import { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

/**
 * OTP Input — 6 ô riêng biệt, auto-focus next, paste support.
 *
 * Props:
 *   - value: string (6 chars, có thể chưa đầy)
 *   - onChange(value): callback khi user nhập
 *   - onComplete(value): callback khi đủ 6 số
 *   - disabled
 *   - error: bool (visual feedback)
 *   - autoFocus: focus ô đầu khi mount
 */
export interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
  length?: number
  className?: string
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
  length = 6,
  className,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [autoFocus])

  const setRef = useCallback((idx: number) => (el: HTMLInputElement | null) => {
    inputsRef.current[idx] = el
  }, [])

  const focusIndex = (idx: number) => {
    const el = inputsRef.current[idx]
    if (el) {
      el.focus()
      el.select()
    }
  }

  const setDigit = (idx: number, digit: string) => {
    if (!/^\d?$/.test(digit)) return
    const chars = value.padEnd(length, ' ').split('')
    chars[idx] = digit || ' '
    const next = chars.join('').trimEnd()
    onChange(next)
    if (digit && idx < length - 1) focusIndex(idx + 1)
    if (next.length === length) onComplete?.(next)
  }

  const handleChange = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    setDigit(idx, digit)
  }

  const handleKeyDown = (idx: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[idx]) {
        setDigit(idx, '')
      } else if (idx > 0) {
        setDigit(idx - 1, '')
        focusIndex(idx - 1)
      }
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focusIndex(idx - 1)
      e.preventDefault()
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      focusIndex(idx + 1)
      e.preventDefault()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    e.preventDefault()
    onChange(pasted)
    const lastIdx = Math.min(pasted.length, length) - 1
    if (lastIdx >= 0) {
      focusIndex(lastIdx)
      if (pasted.length === length) onComplete?.(pasted)
    }
  }

  return (
    <div className={cn('flex gap-2 justify-center', className)} role="group" aria-label="Mã OTP">
      {Array.from({ length }, (_, idx) => (
        <input
          key={idx}
          ref={setRef(idx)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[idx] ?? ''}
          onChange={handleChange(idx)}
          onKeyDown={handleKeyDown(idx)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`Số thứ ${idx + 1}`}
          autoComplete="one-time-code"
          className={cn(
            'w-12 h-14 text-center text-display-md font-mono font-bold',
            'border bg-ink-800 text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-electric/40',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            error
              ? 'border-danger focus:border-danger'
              : 'border-ink-400 focus:border-electric'
          )}
        />
      ))}
    </div>
  )
}
