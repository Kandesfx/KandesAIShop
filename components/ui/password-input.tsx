'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input, InputProps } from './input'

/**
 * Password input — Input với show/hide toggle.
 *
 * Truyền `type` prop bị ignore — luôn dùng password/text. Label/hint/error inherit từ Input.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = React.useState(false)
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? 'text' : 'password'}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={show}
          tabIndex={-1}
          className="absolute right-2 top-[34px] -translate-y-1/2 p-1.5 text-ink-200 hover:text-ink-50 transition-colors focus:outline-none focus:ring-2 focus:ring-electric/40 rounded"
        >
          {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = 'PasswordInput'
