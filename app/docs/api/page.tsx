import Link from 'next/link'
import { BookOpen, Terminal, Cpu, ArrowRight, ShieldCheck, Search } from 'lucide-react'

export const metadata = {
  title: 'Kandes API · API AI qua Kandes.shop',
  description: 'Sử dụng Claude Code, Codex, OpenAI client qua Kandes.shop',
}

export default function DocsApiLanding() {
  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 py-12">
      <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">

        {/* ── Header Card ── */}
        <div className="bg-ink-800/90 border border-ink-400 p-8 rounded-2xl space-y-4 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-sky-400 text-[11px] font-mono px-3.5 py-1 rounded-full font-semibold">
            <BookOpen size={14} className="text-sky-400" />
            TÀI LIỆU API HƯỚNG DẪN
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Kandes AI API Docs
          </h1>
          <p className="text-[14px] text-ink-100 max-w-xl leading-relaxed">
            Sử dụng API key từ Kandes.shop trực tiếp với các client hàng đầu: <strong className="text-white">Claude Code, Codex CLI, OpenAI SDK Python/Node.js</strong>.
          </p>
        </div>

        {/* ── 3 Steps Card ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 sm:p-8 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <ShieldCheck size={20} className="text-sky-400" />
            3 Bước Để Bắt Đầu
          </h2>
          <ol className="space-y-4 text-[13px] text-ink-100">
            <li className="flex items-start gap-3 bg-ink-900 p-4 rounded-xl border border-ink-400/60">
              <span className="flex items-center justify-center w-7 h-7 bg-blue-500/20 text-sky-400 font-mono font-bold rounded-lg shrink-0">1</span>
              <div>
                <strong className="text-white">Mua gói dịch vụ:</strong> Truy cập <Link href="/products" className="text-sky-400 font-bold hover:underline">kandes.shop/products</Link> để chọn gói AI phù hợp (Starter / Pro / Business).
              </div>
            </li>
            <li className="flex items-start gap-3 bg-ink-900 p-4 rounded-xl border border-ink-400/60">
              <span className="flex items-center justify-center w-7 h-7 bg-blue-500/20 text-sky-400 font-mono font-bold rounded-lg shrink-0">2</span>
              <div>
                <strong className="text-white">Nhận API Key:</strong> Sau khi thanh toán hoàn tất, bạn nhận email có chứa chuỗi API key <code className="bg-ink-700 text-sky-300 px-2 py-0.5 rounded font-mono text-[12px] border border-ink-400">ks-xxx</code>.
              </div>
            </li>
            <li className="flex items-start gap-3 bg-ink-900 p-4 rounded-xl border border-ink-400/60">
              <span className="flex items-center justify-center w-7 h-7 bg-blue-500/20 text-sky-400 font-mono font-bold rounded-lg shrink-0">3</span>
              <div>
                <strong className="text-white">Cấu hình Client:</strong> Thay đổi Base URL và Auth Token theo hướng dẫn chi tiết tại <Link href="/docs/api/getting-started" className="text-sky-400 font-bold hover:underline">Getting Started</Link>.
              </div>
            </li>
          </ol>
        </section>

        {/* ── Endpoints Card ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 sm:p-8 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Terminal size={20} className="text-emerald-400" />
            Các Endpoints Khả Dụng
          </h2>
          <div className="space-y-3 font-mono text-[12px]">
            <div className="bg-ink-900 p-4 rounded-xl border border-ink-400/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded text-[11px]">POST</span>
                <code className="text-white font-bold text-[13px]">/v1/chat/completions</code>
              </div>
              <span className="text-ink-200 text-[11px]">OpenAI Chat Completions (Stream + Non-stream)</span>
            </div>

            <div className="bg-ink-900 p-4 rounded-xl border border-ink-400/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-sky-400 font-bold rounded text-[11px]">GET</span>
                <code className="text-white font-bold text-[13px]">/v1/models</code>
              </div>
              <span className="text-ink-200 text-[11px]">Danh sách các Model được phép truy cập</span>
            </div>

            <div className="bg-ink-900 p-4 rounded-xl border border-ink-400/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-sky-400 font-bold rounded text-[11px]">GET</span>
                <code className="text-white font-bold text-[13px]">/v1/usage</code>
              </div>
              <span className="text-ink-200 text-[11px]">Kiểm tra hạn ngạch và thống kê token sử dụng</span>
            </div>
          </div>
        </section>

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            href="/docs/api/getting-started"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-[13px] uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            Getting Started
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/docs/api/models"
            className="flex items-center gap-2 bg-ink-800 hover:bg-ink-700 border border-ink-400 text-white font-display font-bold text-[13px] uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-md"
          >
            <Cpu size={16} className="text-sky-400" />
            Danh Sách Models
          </Link>
          <Link
            href="/docs/api/codex"
            className="flex items-center gap-2 bg-ink-800 hover:bg-ink-700 border border-ink-400 text-white font-display font-bold text-[13px] uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-md"
          >
            <Terminal size={16} className="text-emerald-400" />
            Hướng Dẫn Codex CLI
          </Link>
          <Link
            href="/tools/model-checker"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-display font-bold text-[13px] uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-purple-600/20"
          >
            <Search size={16} />
            Kiểm Tra Models
          </Link>
        </div>

      </div>
    </div>
  )
}