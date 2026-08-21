'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FaqView } from '@/modules/faq'
import { AutoLinkText } from '@/components/ui/auto-link-text'

interface Props {
  items: FaqView[]
}

export function FaqAccordion({ items }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {items.map((faq) => {
        const open = openId === faq.id
        return (
          <div key={faq.id} className="border border-ink-400 bg-ink-800/40">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : faq.id)}
              className="w-full flex items-center justify-between gap-2 p-3 text-left"
              aria-expanded={open}
            >
              <span className="text-[13px] font-display text-ink-50">{faq.question}</span>
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                className={`text-ink-200 transition-transform ${open ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {open && (
              <div className="px-3 pb-3 text-[12px] text-ink-50 leading-relaxed whitespace-pre-wrap border-t border-ink-400/40 pt-3">
                <AutoLinkText text={faq.answer} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
