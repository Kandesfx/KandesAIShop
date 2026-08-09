import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full px-4 py-2.5 text-[13px] bg-ink-700 border border-ink-300 text-ink-50',
          'placeholder:text-ink-200',
          'focus:border-electric focus:outline-none focus:ring-1 focus:ring-electric/30',
          'transition-colors duration-fast rounded-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
