import { KANDES_BASE_URL } from '@/modules/ai-gateway/branding'

export const metadata = {
  title: 'Codex CLI · Kandes AI API',
}

/**
 * Phase 7-RB (D56): Hướng dẫn riêng cho Codex CLI.
 *
 * Codex CLI mặc định gọi OpenAI Responses API (`/v1/responses`). Set 2 env:
 *   - OPENAI_BASE_URL = KANDES_BASE_URL
 *   - OPENAI_API_KEY = kandes-key
 *
 * KHÔNG cần đổi model name — Codex CLI gửi raw `gpt-5.4` / `gpt-5.3-codex-spark`.
 */
export default function DocsCodexPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Codex CLI</h1>
        <p className="mt-1 text-sm text-gray-600">
          Dùng Codex CLI với Kandes API Key — chỉ cần đổi base URL.
        </p>
      </header>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">1. Set environment</h2>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 text-sm text-gray-100">
{`# Windows PowerShell
setx OPENAI_BASE_URL "${KANDES_BASE_URL}"
setx OPENAI_API_KEY "<kandes-key>"

# hoặc session hiện tại:
$env:OPENAI_BASE_URL = "${KANDES_BASE_URL}"
$env:OPENAI_API_KEY = "<kandes-key>"`}
        </pre>
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">2. Verify</h2>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 text-sm text-gray-100">
{`codex --version`}
        </pre>
        <p className="mt-2 text-sm text-gray-600">
          Nếu version OK → env đã đọc đúng. Bắt đầu dùng <code className="rounded bg-gray-100 px-1">codex</code> như bình thường.
        </p>
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">3. Test thử</h2>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 text-sm text-gray-100">
{`curl -X POST "${KANDES_BASE_URL}/responses" \\
  -H "Authorization: Bearer <kandes-key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.4",
    "input": [{"role": "user", "content": "hello"}]
  }'`}
        </pre>
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">4. Streaming</h2>
        <p className="text-sm text-gray-600">
          Codex CLI tự động dùng SSE stream. Kandes pass-through stream giữ latency
          thấp nhất — KHÔNG buffer body.
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-4 text-sm text-gray-100">
{`curl -N -X POST "${KANDES_BASE_URL}/responses" \\
  -H "Authorization: Bearer <kandes-key>" \\
  -H "Content-Type: application/json" \\
  -d '{ "model": "gpt-5.4", "input": [...], "stream": true }'`}
        </pre>
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">5. Model khả dụng</h2>
        <p className="text-sm text-gray-600">
          Codex key hiện support các model sau (raw pass-through — KHÔNG cần alias):
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li><code className="rounded bg-gray-100 px-1">gpt-5.4</code></li>
          <li><code className="rounded bg-gray-100 px-1">gpt-5.4-mini</code></li>
          <li><code className="rounded bg-gray-100 px-1">gpt-5.5</code></li>
          <li><code className="rounded bg-gray-100 px-1">codex-auto-review</code></li>
          <li>và các model GPT khác trong catalog — gọi <code className="rounded bg-gray-100 px-1">GET /v1/models</code> để xem đầy đủ.</li>
        </ul>
      </section>
    </div>
  )
}