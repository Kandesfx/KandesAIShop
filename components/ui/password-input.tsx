'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input, InputProps } from './input'

/**
 * Password input — Input với show/hide toggle.
 *
 * Truyền `type` prop bị ignore — luôn dùng password/text. Label/hint/error inherit từ Input.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightElement'>>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = React.useState(false)
    return (
      <Input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={className}
        rightElement={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={show}
            tabIndex={-1}
            className="p-1 text-ink-300 hover:text-ink-50 transition-colors focus:outline-none focus:ring-1 focus:ring-electric/40 rounded flex items-center justify-center"
          >
            {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        }
        {...props}
      />
    )
  }
)
PasswordInput.displayName = 'PasswordInput'
