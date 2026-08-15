'use client'

import * as React from 'react'
import Link from 'next/link'

const QUICK_START_CODE = {
  curl: `curl https://api.kandes.vn/ai/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "kandes-claude",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'`,

  python: `import requests

url = "https://api.kandes.vn/ai/v1/chat/completions"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "model": "kandes-claude",
    "messages": [
        {"role": "user", "content": "Hello, how are you?"}
    ]
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`,

  nodejs: `const response = await fetch('https://api.kandes.vn/ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'kandes-claude',
    messages: [
      { role: 'user', content: 'Hello, how are you?' }
    ]
  })
});

const data = await response.json();
console.log(data);`,
}

type CodeLanguage = keyof typeof QUICK_START_CODE

type QuickStartGuideProps = {
  isOpen: boolean
  onClose: () => void
  apiKey?: string
}

export function QuickStartGuide({ isOpen, onClose, apiKey }: QuickStartGuideProps) {
  const [language, setLanguage] = React.useState<CodeLanguage>('curl')
  const [copied, setCopied] = React.useState(false)

  if (!isOpen) return null

  const code = QUICK_START_CODE[language].replace('YOUR_API_KEY', apiKey || 'YOUR_API_KEY')

  async function handleCopy() {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Quick Start Guide</h2>
              <p className="text-xs text-gray-500">Get started with Kandes AI Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {/* Base URL */}
          <div className="mb-4 rounded-lg bg-blue-50 p-3">
            <p className="mb-1 text-xs font-medium text-blue-700">Base URL</p>
            <code className="text-sm text-blue-900">https://api.kandes.vn/ai/v1</code>
          </div>

          {/* Available Models */}
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Available Models</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'kandes-claude', desc: 'Claude Sonnet 4.6' },
                { name: 'kandes-claude-opus', desc: 'Claude Opus' },
                { name: 'kandes-claude-haiku', desc: 'Claude Haiku' },
                { name: 'kandes-codex', desc: 'GPT-5.4' },
                { name: 'kandes-codex-fast', desc: 'GPT-5.4 Mini' },
                { name: 'kandes-gpt-pro', desc: 'GPT-5.5' },
              ].map((m) => (
                <div key={m.name} className="rounded border p-2">
                  <p className="text-xs font-mono text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Code Example */}
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Example Request</h3>
            
            {/* Language Tabs */}
            <div className="mb-2 flex gap-2">
              {(['curl', 'python', 'nodejs'] as CodeLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`rounded px-3 py-1 text-xs font-medium ${
                    language === lang
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Code Block */}
            <div className="relative rounded-lg bg-gray-900 p-4">
              <button
                onClick={handleCopy}
                className="absolute right-2 top-2 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
              <pre className="overflow-x-auto text-sm">
                <code className="text-gray-100">{code}</code>
              </pre>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/playground"
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
            >
              <span className="text-xl">🧪</span>
              <div>
                <p className="text-sm font-medium">Try Playground</p>
                <p className="text-xs text-gray-500">Test API in browser</p>
              </div>
            </Link>
            <Link
              href="/account/api-keys/pricing"
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
            >
              <span className="text-xl">💰</span>
              <div>
                <p className="text-sm font-medium">View Pricing</p>
                <p className="text-xs text-gray-500">Token costs</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Got it, let&apos;s start!
          </button>
        </div>
      </div>
    </div>
  )
}
