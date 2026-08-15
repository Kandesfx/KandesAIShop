'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Model = {
  id: string
  name: string
  upstream: string
}

const AVAILABLE_MODELS: Model[] = [
  { id: 'kandes-claude', name: 'Claude Sonnet', upstream: 'claude-sonnet-4-6' },
  { id: 'kandes-claude-opus', name: 'Claude Opus', upstream: 'claude-opus-4-6' },
  { id: 'kandes-claude-haiku', name: 'Claude Haiku', upstream: 'claude-haiku-4-5' },
  { id: 'kandes-codex', name: 'GPT-5.4', upstream: 'gpt-5.4' },
  { id: 'kandes-codex-fast', name: 'GPT-5.4 Mini', upstream: 'gpt-5.4-mini' },
]

const SYSTEM_PROMPTS = [
  { id: 'default', label: 'Default', prompt: 'Bạn là một trợ lý AI hữu ích.' },
  { id: 'coder', label: 'Coder', prompt: 'Bạn là một lập trình viên chuyên nghiệp. Viết code sạch, có comment giải thích.' },
  { id: 'reviewer', label: 'Code Reviewer', prompt: 'Bạn là chuyên gia code review. Phân tích code và đề xuất cải thiện.' },
]

export default function PlaygroundPage() {
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState<Model>(AVAILABLE_MODELS[0]!)
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPTS[0]!)
  const [customSystemPrompt, setCustomSystemPrompt] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [tokenUsage, setTokenUsage] = useState<{ prompt: number; completion: number; total: number } | null>(null)

  const effectiveSystemPrompt = systemPrompt.id === 'custom' ? customSystemPrompt : systemPrompt.prompt

  function buildRequestBody(userMessage: string): object {
    const msgs: { role: string; content: string }[] = []
    
    if (effectiveSystemPrompt) {
      msgs.push({ role: 'system', content: effectiveSystemPrompt })
    }
    
    messages.forEach(m => {
      msgs.push({ role: m.role, content: m.content })
    })
    
    msgs.push({ role: 'user', content: userMessage })
    
    return {
      model: selectedModel.id,
      messages: msgs,
      max_tokens: 4096,
      stream: false,
    }
  }

  async function sendMessage() {
    if (!input.trim() || !apiKey.trim()) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setError(null)
    setResponseTime(null)
    setTokenUsage(null)

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    const startTime = Date.now()

    try {
      const response = await fetch('https://kandes.shop/api/ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(buildRequestBody(userMessage)),
      })

      const data = await response.json()
      setResponseTime(Date.now() - startTime)

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Extract response
      const assistantMessage = data.choices?.[0]?.message?.content || 'No response'
      
      // Extract usage if available
      if (data.usage) {
        setTokenUsage({
          prompt: data.usage.prompt_tokens || 0,
          completion: data.usage.completion_tokens || 0,
          total: data.usage.total_tokens || 0,
        })
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }])
    } catch (err) {
      setError((err as Error).message)
      // Remove the user message we just added if there's an error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([])
    setError(null)
    setResponseTime(null)
    setTokenUsage(null)
  }

  function getCurlCommand(): string {
    const body = messages.length > 0
      ? buildRequestBody(input || 'Hello')
      : buildRequestBody('Hello')

    return `curl https://kandes.shop/api/ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -d '${JSON.stringify(body, null, 2).replace(/\n/g, '\n  ')}'`
  }

  function getPythonExample(): string {
    return `from openai import OpenAI

client = OpenAI(
    api_key="${apiKey || 'YOUR_API_KEY'}",
    base_url="https://kandes.shop/api/ai/v1"
)

response = client.chat.completions.create(
    model="${selectedModel.id}",
    messages=[${messages.length > 0 ? '' : `
        {"role": "system", "content": "${effectiveSystemPrompt}"},`}
        {"role": "user", "content": "Hello"}
    ]
)

print(response.choices[0].message.content)`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Playground</h1>
              <p className="text-sm text-gray-500 mt-1">Test AI API với Kandes</p>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showConfig ? 'Hide' : 'Show'} Config
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Config Panel */}
        {showConfig && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Configuration</h2>
            
            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ks-xxxxxxxxxxxx"
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
            </div>

            {/* Model */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <select
                value={selectedModel.id}
                onChange={(e) => {
                  const found = AVAILABLE_MODELS.find(m => m.id === e.target.value)
                  if (found) setSelectedModel(found)
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {AVAILABLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.upstream})
                  </option>
                ))}
              </select>
            </div>

            {/* System Prompt */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
              <select
                value={systemPrompt.id}
                onChange={(e) => {
                  const found = SYSTEM_PROMPTS.find(p => p.id === e.target.value)
                  if (found) setSystemPrompt(found)
                }}
                className="w-full px-3 py-2 border rounded-lg mb-2"
              >
                {SYSTEM_PROMPTS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              {systemPrompt.id === 'custom' && (
                <textarea
                  value={customSystemPrompt}
                  onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  placeholder="Custom system prompt..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              )}
            </div>

            {/* Code Examples */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
                Code Examples
              </summary>
              <div className="mt-3 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">cURL</h4>
                  <CodeBlock code={getCurlCommand()} language="bash" />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Python</h4>
                  <CodeBlock code={getPythonExample()} language="python" />
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Chat Area */}
        <div className="bg-white rounded-lg border flex flex-col" style={{ height: '600px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-lg font-medium">Bắt đầu cuộc trò chuyện</p>
                <p className="text-sm mt-1">Nhập tin nhắn để test API</p>
                {!apiKey && (
                  <p className="text-xs mt-2 text-amber-600">
                    ⚠️ Cần nhập API Key ở config
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                  ❌ Error: {error}
                </div>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          {(responseTime || tokenUsage) && (
            <div className="px-6 py-2 bg-gray-50 border-t flex items-center gap-4 text-xs text-gray-500">
              {responseTime && (
                <span>⏱️ {responseTime}ms</span>
              )}
              {tokenUsage && (
                <>
                  <span>📊 Tokens: {tokenUsage.total.toLocaleString()}</span>
                  <span className="text-gray-400">({tokenUsage.prompt} in / {tokenUsage.completion} out)</span>
                </>
              )}
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder={apiKey ? "Nhập tin nhắn..." : "Nhập API Key ở config trước..."}
                disabled={loading || !apiKey}
                className="flex-1 px-4 py-3 border rounded-lg resize-none disabled:bg-gray-100"
                rows={2}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={sendMessage}
                  disabled={loading || !apiKey || !input.trim()}
                  isLoading={loading}
                >
                  Send
                </Button>
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearChat}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Model Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {AVAILABLE_MODELS.map(model => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model)}
              className={`p-4 rounded-lg border text-left transition-all ${
                selectedModel.id === model.id
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-3 h-3 rounded-full ${
                  selectedModel.id === model.id ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                <span className="font-medium text-sm">{model.name}</span>
              </div>
              <p className="text-xs text-gray-500 font-mono">{model.id}</p>
              <p className="text-xs text-gray-400 mt-1">→ {model.upstream}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
