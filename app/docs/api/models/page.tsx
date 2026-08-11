import { MODEL_ALIASES } from '@/modules/ai-gateway/models'
import Link from 'next/link'
import { Cpu, ChevronLeft, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Models · Kandes AI API',
}

export default function DocsModelsPage() {
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
            <Cpu size={14} className="text-sky-400" />
            CATALOG MODEL KHẢ DỤNG
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Danh Sách Models
          </h1>
          <p className="text-[13px] text-ink-100">
            Danh sách 8 model công khai chính thức của Kandes API. Bạn có thể gọi trực tiếp qua tên alias <code className="bg-ink-900 text-sky-300 px-2 py-0.5 rounded font-mono border border-ink-400">kandes-*</code>.
          </p>
        </div>

        {/* ── Model Table Card ── */}
        <div className="border border-ink-400 bg-ink-800/90 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ink-400 bg-ink-900 text-[11px] font-mono uppercase text-ink-200 tracking-wider">
                  <th className="py-4 px-5">Alias (Request Model)</th>
                  <th className="py-4 px-5">Family</th>
                  <th className="py-4 px-5">Mô Tả & Use Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-400/50 text-[12px] font-mono">
                {MODEL_ALIASES.map((m) => (
                  <tr key={m.alias} className="hover:bg-ink-700/40 transition-colors">
                    <td className="py-4 px-5">
                      <code className="text-sky-400 font-bold bg-ink-900 px-2.5 py-1 rounded border border-ink-400">
                        {m.alias}
                      </code>
                    </td>
                    <td className="py-4 px-5 text-white font-semibold">{m.family}</td>
                    <td className="py-4 px-5 text-ink-100 font-sans text-[13px]">
                      {describeUseCase(m.family)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pass-through Notice ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-2 shadow-lg">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            Hỗ Trợ Raw Model Names (Pass-through)
          </h2>
          <p className="text-[13px] text-ink-100 leading-relaxed">
            Nếu bạn đang dùng Codex CLI hoặc Claude Code đã cấu hình tên model mặc định (ví dụ <code className="bg-ink-900 text-emerald-400 px-1.5 py-0.5 rounded font-mono">gpt-5.4</code>, <code className="bg-ink-900 text-emerald-400 px-1.5 py-0.5 rounded font-mono">claude-sonnet-4.6</code>), bạn hoàn toàn CÓ THỂ gửi trực tiếp tên raw model — Kandes sẽ tự động xử lý pass-through mượt mà.
          </p>
        </section>

        {/* ── Rate Limits ── */}
        <section className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-3 shadow-lg">
          <h2 className="text-lg font-display font-bold text-white">Giới Hạn Tốc Độ (Rate Limits)</h2>
          <p className="text-[13px] text-ink-100">
            Giới hạn RPM (yêu cầu mỗi phút) áp dụng theo từng gói dịch vụ:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-ink-900 p-4 rounded-xl border border-ink-400/60 text-center">
              <div className="text-[11px] font-mono text-ink-200 uppercase font-bold">Gói Starter</div>
              <div className="text-xl font-display font-bold text-white mt-1">60 RPM</div>
            </div>
            <div className="bg-ink-900 p-4 rounded-xl border border-ink-400/60 text-center">
              <div className="text-[11px] font-mono text-sky-400 uppercase font-bold">Gói Pro</div>
              <div className="text-xl font-display font-bold text-sky-300 mt-1">300 RPM</div>
            </div>
            <div className="bg-ink-900 p-4 rounded-xl border border-ink-400/60 text-center">
              <div className="text-[11px] font-mono text-emerald-400 uppercase font-bold">Gói Business</div>
              <div className="text-xl font-display font-bold text-emerald-400 mt-1">1000 RPM</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

function describeUseCase(family: string): string {
  switch (family) {
    case 'gpt-codex':
      return 'Tối ưu cho Codex CLI, lập trình, sinh mã nguồn tự động'
    case 'gpt-codex-mini':
      return 'Phiên bản Codex rút gọn siêu tốc, chi phí cực kỳ tiết kiệm'
    case 'gpt-pro':
      return 'Dòng GPT Pro đa năng, xử lý hình ảnh & tài liệu kỹ thuật'
    case 'claude-sonnet':
      return 'Tối ưu cho Claude Code, phân tích file lớn, viết lách chuyên sâu'
    case 'claude-sonnet-pro':
      return 'Claude Sonnet 5 — khả năng suy luận logic nâng cao'
    case 'claude-opus':
      return 'Claude Opus — suy luận chiều sâu đỉnh cao cho bài toán khó'
    case 'claude-haiku':
      return 'Claude Haiku — tốc độ phản hồi tức thì, tối ưu chi phí'
    default:
      return 'Model AI xử lý ngôn ngữ tự nhiên'
  }
}