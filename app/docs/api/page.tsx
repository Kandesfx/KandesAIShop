import Link from 'next/link'

export const metadata = {
  title: 'Kandes API · API AI qua Kandes.shop',
  description: 'Sử dụng Claude Code, Codex, OpenAI client qua Kandes.shop',
}

export default function DocsApiLanding() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold">Kandes AI API</h1>
        <p className="mt-2 text-gray-600">
          Mua API key trên Kandes.shop → dùng ngay với Claude Code, Codex, OpenAI client.
        </p>
      </header>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-3 text-xl font-semibold">3 bước bắt đầu</h2>
        <ol className="space-y-3 text-sm">
          <li>
            <strong>1. Mua gói</strong> — vào <Link href="/products" className="text-blue-600 underline">kandes.shop</Link>, chọn gói AI (Starter / Pro / Business).
          </li>
          <li>
            <strong>2. Nhận API key</strong> — sau khi thanh toán, bạn nhận email có `ks-xxx` API key.
          </li>
          <li>
            <strong>3. Point client</strong> — set base URL + auth token như hướng dẫn <Link href="/docs/api/getting-started" className="text-blue-600 underline">Getting Started</Link>.
          </li>
        </ol>
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-3 text-xl font-semibold">Endpoints</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="rounded bg-gray-100 px-2 py-1">POST /v1/chat/completions</code> —
            OpenAI-compatible chat completions, hỗ trợ stream + non-stream.
          </li>
          <li>
            <code className="rounded bg-gray-100 px-2 py-1">GET /v1/models</code> — list models KH được dùng.
          </li>
          <li>
            <code className="rounded bg-gray-100 px-2 py-1">GET /v1/usage</code> — xem usage của key hiện tại.
          </li>
        </ul>
      </section>

      <div className="flex gap-3">
        <Link
          href="/docs/api/getting-started"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Getting Started →
        </Link>
        <Link
          href="/docs/api/models"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Models
        </Link>
      </div>
    </div>
  )
}