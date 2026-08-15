import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { PricingTable } from '@/components/ai/pricing-table'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/account/api-keys/pricing')

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Model Pricing</h1>
        <p className="mt-1 text-sm text-gray-600">
          Reference pricing từ NCC Pro. Chi phí thực tế phụ thuộc vào model và usage.
        </p>
      </header>

      <PricingTable />

      {/* Cost Estimator */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Cost Estimator</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ước tính chi phí cho một số request phổ biến.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900 mb-2">Simple Chat</h3>
            <p className="text-xs text-gray-500 mb-2">~500 tokens input, ~200 output</p>
            <div className="text-2xl font-bold text-gray-900">~$0.004</div>
            <p className="text-xs text-gray-500 mt-1">
              Claude Sonnet 4.6: 500 × $0.003 + 200 × $0.015
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="font-medium text-gray-900 mb-2">Code Review</h3>
            <p className="text-xs text-gray-500 mb-2">~1K tokens input, ~500 output</p>
            <div className="text-2xl font-bold text-gray-900">~$0.010</div>
            <p className="text-xs text-gray-500 mt-1">
              Claude Sonnet 4.6: 1000 × $0.003 + 500 × $0.015
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <h3 className="font-medium text-gray-900 mb-2">Long Context</h3>
            <p className="text-xs text-gray-500 mb-2">~50K tokens input, ~2K output</p>
            <div className="text-2xl font-bold text-gray-900">~$0.31</div>
            <p className="text-xs text-gray-500 mt-1">
              Claude Sonnet 4.6: 50K × $0.003 + 2K × $0.015
            </p>
          </div>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Token Estimation</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• 1 token ≈ 4 ký tự tiếng Anh</li>
              <li>• 1 token ≈ 1-2 ký tự tiếng Việt</li>
              <li>• 1 trang tài liệu ≈ 300-500 tokens</li>
              <li>• 1,000 lines of code ≈ 4,000 tokens</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Cost Tips</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Haiku: ~5x rẻ hơn Opus cho simple tasks</li>
              <li>• Sonnet: balanced choice cho coding</li>
              <li>• Opus: for complex reasoning tasks</li>
              <li>• Mini variants: faster, cheaper alternative</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm text-amber-800">
          <strong>Lưu ý:</strong> Đây là giá tham khảo từ NCC Pro. Chi phí thực tế có thể khác
          do rounding và các yếu tố khác. Kandes không tính phí thêm cho việc sử dụng API.
        </p>
      </div>
    </div>
  )
}
