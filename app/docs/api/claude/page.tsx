import { KANDES_BASE_URL } from '@/modules/ai-gateway/branding'
import Link from 'next/link'
import { ChevronLeft, Terminal, CheckCircle2, Cpu, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'Claude Code · Kandes AI API',
  description: 'Cài đặt Claude Code với Kandes API Key — 1 lệnh duy nhất trên macOS/Linux/Windows.',
}

const ONE_LINERS = {
  bash: 'curl -fsSL https://kandes.shop/install/claude/claude-config-kandes.sh | bash',
  ps: 'irm https://kandes.shop/install/claude/claude-config-kandes.ps1 | iex',
  cmd: 'curl -fsSL https://kandes.shop/install/claude/claude-config-kandes.bat -o "%TEMP%\\kandes-claude.bat" && "%TEMP%\\kandes-claude.bat"',
}

export default function DocsClaudePage() {
  return (
    <div className="bg-ink-900 text-ink-50 py-12">
      <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">

        {/* ── Back Navigation ── */}
        <Link
          href="/docs/api"
          className="inline-flex items-center gap-1.5 text-[13px] font-mono text-ink-200 hover:text-sky-400 transition-colors"
        >
          <ChevronLeft size={16} />
          Quay lại trang tài liệu API
        </Link>

        {/* ── Header Card ── */}
        <div className="bg-ink-800/90 border border-ink-400 p-6 sm:p-8 rounded-2xl space-y-3 shadow-2xl backdrop-blur-md">
          <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[12px] font-mono px-3.5 py-1 rounded-full font-semibold">
            <Sparkles size={14} className="text-sky-400" />
            HƯỚNG DẪN CLAUDE CODE
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Cấu Hình Claude Code
          </h1>
          <p className="text-[13px] text-ink-100">
            Trỏ <code className="bg-ink-900 text-sky-300 px-1.5 py-0.5 rounded font-mono text-[13px]">ANTHROPIC_BASE_URL</code> về Kandes — script tự ghi <code className="bg-ink-900 text-sky-300 px-1.5 py-0.5 rounded font-mono text-[13px]">~/.claude/settings.json</code> cho bạn.
          </p>
        </div>

        {/* ── Quick Install (one-liner) ── */}
        <section className="bg-gradient-to-br from-sky-500/10 to-fuchsia-500/10 border border-sky-500/30 p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-sky-400" />
            <h2 className="text-lg font-display font-bold text-white">Cài đặt tự động (1 lệnh)</h2>
            <span className="text-[12px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">Khuyến nghị</span>
          </div>
          <p className="text-[13px] text-ink-100">
            Copy lệnh phù hợp với hệ điều hành của bạn, paste vào terminal/cmd, nhập API key khi được hỏi.
            Script sẽ tự động ghi <code className="bg-ink-900 text-sky-300 px-1.5 py-0.5 rounded font-mono text-[13px]">~/.claude/settings.json</code> với base URL trỏ về Kandes.
          </p>
          <div className="space-y-2">
            <div>
              <div className="text-[12px] font-mono text-sky-400 mb-1">macOS / Linux (bash)</div>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-3 font-mono text-[13px] text-sky-300 border border-ink-400/80">
{ONE_LINERS.bash}
              </pre>
            </div>
            <div>
              <div className="text-[12px] font-mono text-sky-400 mb-1">Windows PowerShell (khuyến nghị)</div>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-3 font-mono text-[13px] text-sky-300 border border-ink-400/80">
{ONE_LINERS.ps}
              </pre>
            </div>
            <div>
              <div className="text-[12px] font-mono text-sky-400 mb-1">Windows CMD (overwrite + backup)</div>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-3 font-mono text-[13px] text-sky-300 border border-ink-400/80">
{ONE_LINERS.cmd}
              </pre>
            </div>
          </div>
        </section>

        {/* ── Step 1 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-sky-400/20 text-sky-400 font-mono font-bold rounded text-[13px]">1</span>
            Thiết Lập Biến Môi Trường (Environment)
          </h2>
          <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[13px] text-sky-300 border border-ink-400/80 shadow-inner">
{`# Windows PowerShell (Lưu vĩnh viễn):
setx ANTHROPIC_BASE_URL "https://api.kandes.shop"
setx ANTHROPIC_AUTH_TOKEN "<kandes-key>"

# Hoặc áp dụng cho session hiện tại:
$env:ANTHROPIC_BASE_URL = "https://api.kandes.shop"
$env:ANTHROPIC_AUTH_TOKEN = "<kandes-key>"`}
          </pre>
        </section>

        {/* ── Step 2 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-sky-400/20 text-sky-400 font-mono font-bold rounded text-[13px]">2</span>
            Kiểm Tra Phiên Bản
          </h2>
          <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[13px] text-ink-100 border border-ink-400/80 shadow-inner">
{`claude --version`}
          </pre>
          <p className="text-[13px] text-ink-100">
            Nếu lệnh trả về phiên bản Claude Code thành công, hệ thống đã nhận đúng biến môi trường. Bạn có thể gõ <code className="bg-ink-900 text-sky-300 px-1.5 py-0.5 rounded font-mono">claude</code> để bắt đầu code.
          </p>
        </section>

        {/* ── Step 3 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-sky-400/20 text-sky-400 font-mono font-bold rounded text-[13px]">3</span>
            Test Thử Request API (Anthropic Messages API)
          </h2>
          <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[13px] text-sky-300 border border-ink-400/80 shadow-inner">
{`curl -X POST "https://api.kandes.shop/v1/messages" \\
  -H "x-api-key: <kandes-key>" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "hello"}]
  }'`}
          </pre>
        </section>

        {/* ── Step 4 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-sky-400/20 text-sky-400 font-mono font-bold rounded text-[13px]">4</span>
            Hỗ Trợ Streaming (SSE)
          </h2>
          <p className="text-[13px] text-ink-100">
            Claude Code tự động sử dụng SSE stream. Kandes API giữ kết nối pass-through trực tiếp với latency thấp nhất mà không buffer dữ liệu.
          </p>
          <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[13px] text-ink-100 border border-ink-400/80 shadow-inner">
{`curl -N -X POST "https://api.kandes.shop/v1/messages" \\
  -H "x-api-key: <kandes-key>" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{ "model": "claude-3-5-sonnet-20241022", "max_tokens": 1024, "messages": [{"role": "user", "content": "hello"}], "stream": true }'`}
          </pre>
        </section>

        {/* ── Step 5 ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Cpu size={18} className="text-sky-400" />
            Các Model Hỗ Trợ Trực Tiếp
          </h2>
          <p className="text-[13px] text-ink-100">
            Kandes proxy Anthropic-compatible API, hỗ trợ đầy đủ các model chính (tự động mapping sang upstream provider):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-ink-900 p-3 rounded-xl border border-ink-400/60 text-center font-mono text-[13px] text-sky-300 font-bold">
              claude-3-5-sonnet
            </div>
            <div className="bg-ink-900 p-3 rounded-xl border border-ink-400/60 text-center font-mono text-[13px] text-sky-300 font-bold">
              claude-3-5-haiku
            </div>
            <div className="bg-ink-900 p-3 rounded-xl border border-ink-400/60 text-center font-mono text-[13px] text-sky-300 font-bold">
              claude-3-opus
            </div>
            <div className="bg-ink-900 p-3 rounded-xl border border-ink-400/60 text-center font-mono text-[13px] text-sky-300 font-bold">
              kandes-claude
            </div>
          </div>
        </section>

        {/* ── Cross-link to Codex installer ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            Cũng dùng Codex CLI?
          </h2>
          <p className="text-[13px] text-ink-100">
            Nếu bạn dùng cả Claude Code lẫn Codex CLI, hãy chạy installer Codex để cấu hình cả hai cùng lúc (chọn option <code className="bg-ink-900 text-emerald-400 px-1.5 py-0.5 rounded font-mono">3. Both Codex and Claude Code</code>).
          </p>
          <Link
            href="/docs/api/codex"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-[13px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
          >
            <Terminal size={14} />
            Hướng Dẫn Codex CLI
          </Link>
        </section>

      </div>
    </div>
  )
}
