'use client'

import React from 'react'
import { ExternalLink } from 'lucide-react'

// Robust regex to match URLs: http://, https://, www., zalo.me/, t.me/, etc.
const URL_REGEX = /(https?:\/\/[^\s<>"'\)]+|www\.[^\s<>"'\)]+|(?:zalo\.me|t\.me)\/[^\s<>"'\)]+)/gi

interface AutoLinkTextProps {
  text?: string | null
  className?: string
  linkClassName?: string
  showIcon?: boolean
}

export function AutoLinkText({
  text,
  className,
  linkClassName = 'text-electric hover:text-electric-hover underline decoration-electric/40 hover:decoration-electric underline-offset-2 break-all transition-colors font-medium inline-flex items-center gap-1',
  showIcon = true,
}: AutoLinkTextProps) {
  if (!text) return null

  // Split by regex while keeping matched groups
  const parts = text.split(URL_REGEX)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.match(URL_REGEX)) {
          let href = part
          // Remove trailing punctuation if accidentally captured
          const cleanHref = href.replace(/[.,;!?]+$/, '')
          const trailingPunct = href.slice(cleanHref.length)

          if (!cleanHref.startsWith('http://') && !cleanHref.startsWith('https://')) {
            href = 'https://' + cleanHref
          } else {
            href = cleanHref
          }

          return (
            <React.Fragment key={i}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{cleanHref}</span>
                {showIcon && (
                  <ExternalLink size={12} className="inline opacity-80 flex-shrink-0" aria-hidden />
                )}
              </a>
              {trailingPunct}
            </React.Fragment>
          )
        }
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </span>
  )
}
