import { Card } from '@/components/ui/card'
import { Cpu, ChevronLeft, Zap, Terminal } from 'lucide-react'
import Link from 'next/link'
import ModelCheckerClient from './ModelCheckerClient'

export const metadata = {
  title: 'Model Checker · Kandes AI API',
  description: 'Kiem tra models co san tu NCC Pro va test xem model nao hoat dong voi API key cua ban.',
}

export default function ModelCheckerPage() {
  return (
    <div className="bg-ink-900 text-ink-50 py-12">
      <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">

        {/* Back Navigation */}
        <Link
          href="/docs/api"
          className="inline-flex items-center gap-1.5 text-[13px] font-mono text-ink-200 hover:text-sky-400 transition-colors"
        >
          <ChevronLeft size={16} />
          Quay lại tài liệu API
        </Link>

        {/* Header Card */}
        <div className="bg-ink-800/90 border border-ink-400 p-6 sm:p-8 rounded-2xl space-y-4 shadow-2xl backdrop-blur-md">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-sky-400 text-[12px] font-mono px-3.5 py-1 rounded-full font-semibold">
            <Cpu size={14} className="text-sky-400" />
            TOOL KIỂM TRA MODELS
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Model Checker
          </h1>
          <p className="text-[14px] text-ink-100 max-w-xl leading-relaxed">
            Kiểm tra models có sẵn từ nhà cung cấp và test xem model nào hoạt động với API key của bạn.
          </p>
        </div>

        {/* How it works */}
        <div className="bg-ink-800/90 border border-ink-400 p-6 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            Cách sử dụng
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-[13px] text-ink-100">
            <li>
              Nhập API key của bạn (Kandes <code className="bg-ink-900 text-sky-300 px-2 py-0.5 rounded font-mono border border-ink-400">ks-*</code> hoặc NCC{' '}
              <code className="bg-ink-900 text-sky-300 px-2 py-0.5 rounded font-mono border border-ink-400">sk-jy-cc-*</code>)
            </li>
            <li>Nhấn <strong className="text-white">Fetch Models</strong> để xem danh sách models có sẵn</li>
            <li>
              Nhấn <strong className="text-white">Test</strong> bên cạnh model để kiểm tra model đó có hoạt động không
            </li>
          </ol>
        </div>

        {/* Checker Component */}
        <div className="bg-ink-800/90 border border-ink-400 rounded-2xl overflow-hidden shadow-xl">
          <div className="border-b border-ink-400 px-6 py-4 bg-ink-900/50">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-sky-400" />
              <span className="text-[13px] font-mono text-ink-200 uppercase tracking-wider">Console</span>
            </div>
          </div>
          <div className="p-6">
            <ModelCheckerClient />
          </div>
        </div>

      </div>
    </div>
  )
}
