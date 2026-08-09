import { KANDES_BASE_URL } from '@/modules/ai-gateway/branding'
import Link from 'next/link'
import { ChevronLeft, Terminal, CheckCircle2, Cpu } from 'lucide-react'

export const metadata = {
  title: 'Codex CLI · Kandes AI API',
}

const ONE_LINERS = {
  bash: 'curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.sh | bash',
  ps: 'irm https://kandes.shop/install/codex/codex-config-kandes.ps1 | iex',
  cmd: 'curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.bat -o "%TEMP%\\kandes.bat" && "%TEMP%\\kandes.bat"',
}

export default function DocsCodexPage() {
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
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono px-3.5 py-1 rounded-full font-semibold">
            <Terminal size={14} className="text-emerald-400" />
            HƯỚNG DẪN CODEX CLI
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Cấu Hình Codex CLI
          </h1>
          <p className="text-[13px] text-ink-100">
            Sử dụng Codex CLI mượt mà với Kandes API Key — chỉ cần thay đổi Base URL và API Key.
          </p>
        </div>

        {/* ── Quick Install (one-liner) ── */}
        <section className="bg-gradient-to-br from-emerald-500/10 to-sky-500/10 border border-emerald-500/30 p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-emerald-400" />
            <h2 className="text-lg font-display font-bold text-white">Cài đặt tự động (1 lệnh)</h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Khuyến nghị</span>
          </div>
          <p className="text-[12px] text-ink-100">
            Copy lệnh phù hợp với hệ điều hành của bạn, paste vào terminal/cmd, nhập API key khi được hỏi.
            Script sẽ tự động ghi config cho Codex CLI và/hoặc Claude Code.
          </p>
          <div className="space-y-2">
            <div>
              <div className="text-[11px] font-mono text-sky-400 mb-1">macOS / Linux (bash)</div>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-3 font-mono text-[12px] text-emerald-400 border border-ink-400/80">
{ONE_LINERS.bash}
              </pre>
            </div>
            <div>
              <div className="text-[11px] font-mono text-sky-400 mb-1">Windows PowerShell</div>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-3 font-mono text-[12px] text-emerald-400 border border-ink-400/80">
{ONE_LINERS.ps}
              </pre>
            </div>
            <div>
              <div className="text-[11px] font-mono text-sky-400 mb-1">Windows CMD (chỉ Codex)</div>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-3 font-mono text-[12px] text-emerald-400 border border-ink-400/80">
{ONE_LINERS.cmd}
              </pre>
            </div>
          </div>
        </section>

        {/* ── Step 1 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-emerald-400/20 text-emerald-400 font-mono font-bold rounded text-[13px]">1</span>
            Thiết Lập Biến Môi Trường (Environment)
          </h2>
          <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-emerald-400 border border-ink-400/80 shadow-inner">
{`# Windows PowerShell (Lưu vĩnh viễn):
setx OPENAI_BASE_URL "${KANDES_BASE_URL}"
setx OPENAI_API_KEY "<kandes-key>"

# Hoặc áp dụng cho session hiện tại:
$env:OPENAI_BASE_URL = "${KANDES_BASE_URL}"
$env:OPENAI_API_KEY = "<kandes-key>"`}
          </pre>
        </section>

        {/* ── Step 2 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-emerald-400/20 text-emerald-400 font-mono font-bold rounded text-[13px]">2</span>
            Kiểm Tra Phiên Bản
          </h2>
          <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-ink-100 border border-ink-400/80 shadow-inner">
{`codex --version`}
          </pre>
          <p className="text-[13px] text-ink-100">
            Nếu lệnh trả về phiên bản Codex thành công, hệ thống đã nhận đúng biến môi trường. Bạn có thể gõ <code className="bg-ink-900 text-emerald-400 px-1.5 py-0.5 rounded font-mono">codex</code> để lập trình như bình thường.
          </p>
        </section>

        {/* ── Step 3 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-emerald-400/20 text-emerald-400 font-mono font-bold rounded text-[13px]">3</span>
            Test Thử Request API
          </h2>
          <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-sky-300 border border-ink-400/80 shadow-inner">
{`curl -X POST "${KANDES_BASE_URL}/responses" \\
  -H "Authorization: Bearer <kandes-key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.4",
    "input": [{"role": "user", "content": "hello"}]
  }'`}
          </pre>
        </section>

        {/* ── Step 4 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-emerald-400/20 text-emerald-400 font-mono font-bold rounded text-[13px]">4</span>
            Hỗ Trợ Streaming (SSE)
          </h2>
          <p className="text-[13px] text-ink-100">
            Codex CLI tự động sử dụng SSE stream. Kandes API giữ kết nối pass-through trực tiếp với latency thấp nhất mà không buffer dữ liệu.
          </p>
          <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-ink-100 border border-ink-400/80 shadow-inner">
{`curl -N -X POST "${KANDES_BASE_URL}/responses" \\
  -H "Authorization: Bearer <kandes-key>" \\
  -H "Content-Type: application/json" \\
  -d '{ "model": "gpt-5.4", "input": [...], "stream": true }'`}
          </pre>
        </section>

        {/* ── Step 5 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Cpu size={18} className="text-sky-400" />
            Các Model Hỗ Trợ Trực Tiếp
          </h2>
          <p className="text-[13px] text-ink-100">
            Gói Codex hỗ trợ các model chính sau (gửi raw model name trực tiếp):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-ink-900 p-3 rounded-xl border border-ink-400/60 text-center font-mono text-[12px] text-emerald-400 font-bold">
              gpt-5.4
            </div>
            <div className="bg-ink-900 p-3 rounded-xl border border-ink-400/60 text-center font-mono text-[12px] text-emerald-400 font-bold">
              gpt-5.4-mini
            </div>
            <div className="bg-ink-900 p-3 rounded-xl border border-ink-400/60 text-center font-mono text-[12px] text-emerald-400 font-bold">
              gpt-5.5
            </div>
            <div className="bg-ink-900 p-3 rounded-xl border border-ink-400/60 text-center font-mono text-[12px] text-emerald-400 font-bold">
              codex-auto-review
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}