'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language = 'json', className }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Simple JSON syntax highlighting
  function highlightJson(json: string): React.ReactNode {
    try {
      const formatted = JSON.stringify(JSON.parse(json), null, 2)
      return formatted.split('\n').map((line, i) => {
        let highlighted = line
          .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
          .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
          .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
          .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
          .replace(/: (null)/g, ': <span class="json-null">$1</span>')

        return (
          <div key={i}>
            <span className="json-line">{highlighted}</span>
          </div>
        )
      })
    } catch {
      return <div className="json-line">{json}</div>
    }
  }

  return (
    <div className={cn('relative group', className)}>
      {/* Copy button */}
      <button
        onClick={copyToClipboard}
        className={cn(
          'absolute right-2 top-2 px-2 py-1 rounded text-xs transition-all',
          'opacity-0 group-hover:opacity-100',
          'bg-gray-700 text-gray-300 hover:bg-gray-600',
          copied && 'bg-green-600 text-white'
        )}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>

      {/* Language label */}
      <div className="absolute left-2 top-2 text-xs text-gray-500 uppercase">
        {language}
      </div>

      {/* Code */}
      <pre
        className={cn(
          'p-4 pt-8 rounded-lg bg-gray-900 text-gray-100',
          'font-mono text-xs overflow-auto max-h-[500px]',
          'border border-gray-700'
        )}
      >
        <code>{highlightJson(code)}</code>
      </pre>

      <style jsx>{`
        :global(.json-key) {
          color: #7dd3fc;
        }
        :global(.json-string) {
          color: #86efac;
        }
        :global(.json-number) {
          color: #fbbf24;
        }
        :global(.json-boolean) {
          color: #c084fc;
        }
        :global(.json-null) {
          color: #94a3b8;
        }
        :global(.json-line) {
          min-height: 1.5em;
        }
      `}</style>
    </div>
  )
}
