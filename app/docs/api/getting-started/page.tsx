export const metadata = {
  title: 'Getting Started · Kandes AI API',
}

export default function DocsGettingStarted() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Getting Started</h1>
        <p className="mt-1 text-sm text-gray-600">
          3 bước để bắt đầu dùng Kandes AI API.
        </p>
      </header>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">Bước 1 — Mua gói</h2>
        <p className="text-sm text-gray-600">
          Vào <a href="/products" className="text-blue-600 underline">kandes.shop/products</a>, chọn gói AI phù hợp.
          Sau khi thanh toán, bạn sẽ nhận được API key <code className="rounded bg-gray-100 px-1">ks-xxx</code> qua email.
        </p>
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">Bước 2 — Set environment</h2>
        <p className="mb-3 text-sm text-gray-600">Base URL + auth token cho client AI:</p>
        <h3 className="mb-2 text-sm font-semibold">Claude Code</h3>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 font-mono text-xs text-gray-100">
{`export ANTHROPIC_BASE_URL="https://kandes.shop/api/ai/v1"
export ANTHROPIC_AUTH_TOKEN="ks-YOUR_KEY_HERE"`}
        </pre>

        <h3 className="mb-2 mt-4 text-sm font-semibold">OpenAI client / Codex</h3>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 font-mono text-xs text-gray-100">
{`export OPENAI_BASE_URL="https://kandes.shop/api/ai/v1"
export OPENAI_API_KEY="ks-YOUR_KEY_HERE"`}
        </pre>

        <h3 className="mb-2 mt-4 text-sm font-semibold">Python (openai SDK)</h3>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 font-mono text-xs text-gray-100">
{`import openai

client = openai.OpenAI(
    base_url="https://kandes.shop/api/ai/v1",
    api_key="ks-YOUR_KEY_HERE",
)

resp = client.chat.completions.create(
    model="kandes-gpt-4o",
    messages=[{"role": "user", "content": "Xin chào"}],
)
print(resp.choices[0].message.content)`}
        </pre>

        <h3 className="mb-2 mt-4 text-sm font-semibold">Node.js</h3>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 font-mono text-xs text-gray-100">
{`import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://kandes.shop/api/ai/v1',
  apiKey: 'ks-YOUR_KEY_HERE',
})

const resp = await client.chat.completions.create({
  model: 'kandes-gpt-4o',
  messages: [{ role: 'user', content: 'Xin chào' }],
})
console.log(resp.choices[0].message.content)`}
        </pre>
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">Bước 3 — Test</h2>
        <h3 className="mb-2 text-sm font-semibold">curl</h3>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 font-mono text-xs text-gray-100">
{`curl -X POST https://kandes.shop/api/ai/v1/chat/completions \\
  -H "Authorization: Bearer ks-YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "kandes-gpt-4o",
    "messages": [{"role": "user", "content": "Xin chào"}]
  }'`}
        </pre>
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">Streaming</h2>
        <p className="mb-3 text-sm text-gray-600">
          Thêm <code className="rounded bg-gray-100 px-1">"stream": true</code> để nhận SSE:
        </p>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 font-mono text-xs text-gray-100">
{`curl -X POST https://kandes.shop/api/ai/v1/chat/completions \\
  -H "Authorization: Bearer ks-YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"kandes-gpt-4o","stream":true,"messages":[{"role":"user","content":"Xin chào"}]}'`}
        </pre>
      </section>
    </div>
  )
}