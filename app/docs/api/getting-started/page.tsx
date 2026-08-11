import { KANDES_BASE_URL } from '@/modules/ai-gateway/branding'
import Link from 'next/link'
import { ChevronLeft, Zap, Terminal, Code, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Getting Started · Kandes AI API',
}

export default function DocsGettingStarted() {
  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 py-12">
      <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">

        {/* ── Back Navigation ── */}
        <Link
          href="/docs/api"
          className="inline-flex items-center gap-1.5 text-[12px] font-mono text-ink-200 hover:text-sky-400 transition-colors"
        >
          <ChevronLeft size={16} />
          Quay lại trang tài liệu API
        </Link>

        {/* ── Header Card ── */}
        <div className="bg-ink-800/90 border border-ink-400 p-6 sm:p-8 rounded-2xl space-y-3 shadow-2xl backdrop-blur-md">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-sky-400 text-[11px] font-mono px-3.5 py-1 rounded-full font-semibold">
            <Zap size={14} className="text-sky-400" />
            HƯỚNG DẪN BẮT ĐẦU
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Getting Started
          </h1>
          <p className="text-[13px] text-ink-100">
            3 bước nhanh chóng để tích hợp và bắt đầu sử dụng Kandes AI API.
          </p>
        </div>

        {/* ── Step 1 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 bg-blue-500/20 text-sky-400 font-mono font-bold rounded-lg text-[14px]">1</span>
            Bước 1 — Mua Gói Dịch Vụ
          </h2>
          <p className="text-[13px] text-ink-100 leading-relaxed">
            Vào <Link href="/products" className="text-sky-400 font-bold hover:underline">kandes.shop/products</Link> để mua gói AI phù hợp. Sau khi thanh toán hoàn tất, bạn sẽ nhận được chuỗi API key <code className="bg-ink-900 text-sky-300 px-2 py-0.5 rounded font-mono border border-ink-400 text-[12px]">ks-xxx</code> gửi trực tiếp qua email.
          </p>
        </section>

        {/* ── Step 2 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-5 shadow-xl">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 bg-blue-500/20 text-sky-400 font-mono font-bold rounded-lg text-[14px]">2</span>
            Bước 2 — Cấu Hình Biến Môi Trường (Environment)
          </h2>
          <p className="text-[13px] text-ink-100">
            Thiết lập <strong className="text-white">Base URL</strong> và <strong className="text-white">API Key</strong> cho công cụ client bạn đang sử dụng:
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="text-[13px] font-mono uppercase text-sky-400 font-bold mb-2 flex items-center gap-2">
                <Terminal size={14} />
                1. Claude Code
              </h3>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-sky-300 border border-ink-400/80 shadow-inner">
{`export ANTHROPIC_BASE_URL="${KANDES_BASE_URL}"
export ANTHROPIC_AUTH_TOKEN="ks-YOUR_KEY_HERE"`}
              </pre>
            </div>

            <div>
              <h3 className="text-[13px] font-mono uppercase text-emerald-400 font-bold mb-2 flex items-center gap-2">
                <Terminal size={14} />
                2. Codex CLI / OpenAI Client
              </h3>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-emerald-400 border border-ink-400/80 shadow-inner">
{`export OPENAI_BASE_URL="${KANDES_BASE_URL}"
export OPENAI_API_KEY="ks-YOUR_KEY_HERE"`}
              </pre>
            </div>

            <div>
              <h3 className="text-[13px] font-mono uppercase text-amber-400 font-bold mb-2 flex items-center gap-2">
                <Code size={14} />
                3. Python (openai SDK)
              </h3>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-ink-100 border border-ink-400/80 shadow-inner">
{`import openai

client = openai.OpenAI(
    base_url="${KANDES_BASE_URL}",
    api_key="ks-YOUR_KEY_HERE",
)

# Có thể dùng alias kandes-* hoặc raw model name
resp = client.chat.completions.create(
    model="kandes-claude",
    messages=[{"role": "user", "content": "Xin chào"}],
)
print(resp.choices[0].message.content)`}
              </pre>
            </div>

            <div>
              <h3 className="text-[13px] font-mono uppercase text-sky-400 font-bold mb-2 flex items-center gap-2">
                <Code size={14} />
                4. Node.js
              </h3>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-ink-100 border border-ink-400/80 shadow-inner">
{`import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: '${KANDES_BASE_URL}',
  apiKey: 'ks-YOUR_KEY_HERE',
})

const resp = await client.chat.completions.create({
  model: 'kandes-claude',
  messages: [{ role: 'user', content: 'Xin chào' }],
})
console.log(resp.choices[0].message.content)`}
              </pre>
            </div>
          </div>
        </section>

        {/* ── Step 3 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 bg-blue-500/20 text-sky-400 font-mono font-bold rounded-lg text-[14px]">3</span>
            Bước 3 — Kiểm Tra Kết Nối (Test)
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-[13px] font-mono uppercase text-ink-100 font-bold mb-2">curl — Chat Completions API</h3>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-sky-300 border border-ink-400/80 shadow-inner">
{`curl -X POST ${KANDES_BASE_URL}/chat/completions \\
  -H "Authorization: Bearer ks-YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "kandes-claude",
    "messages": [{"role": "user", "content": "Xin chào"}]
  }'`}
              </pre>
            </div>

            <div>
              <h3 className="text-[13px] font-mono uppercase text-ink-100 font-bold mb-2">curl — Responses API (Codex)</h3>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-emerald-400 border border-ink-400/80 shadow-inner">
{`curl -X POST ${KANDES_BASE_URL}/responses \\
  -H "Authorization: Bearer ks-YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.4",
    "input": [{"role": "user", "content": "hello"}]
  }'`}
              </pre>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}