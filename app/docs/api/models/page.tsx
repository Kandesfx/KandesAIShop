import { MODEL_ALIASES } from '@/modules/ai-gateway/models'

export const metadata = {
  title: 'Models · Kandes AI API',
}

/**
 * Phase 7-RB (D54): docs liệt kê 8 alias `kandes-*` thật match live CC Pro catalog.
 * KHÔNG lộ upstream model name trên docs — chỉ alias.
 */
export default function DocsModelsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Models</h1>
        <p className="mt-1 text-sm text-gray-600">
          8 model public. KHÔNG lộ upstream — chỉ dùng alias <code className="rounded bg-gray-100 px-1">kandes-*</code>.
        </p>
      </header>

      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left">
            <tr>
              <th className="p-3">Alias (dùng trong request)</th>
              <th className="p-3">Family</th>
              <th className="p-3">Use case</th>
            </tr>
          </thead>
          <tbody>
            {MODEL_ALIASES.map((m) => (
              <tr key={m.alias} className="border-b last:border-0">
                <td className="p-3 font-mono">{m.alias}</td>
                <td className="p-3">{m.family}</td>
                <td className="p-3 text-xs text-gray-600">{describeUseCase(m.family)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">Raw model names (pass-through)</h2>
        <p className="text-sm text-gray-600">
          Nếu bạn dùng Codex CLI hoặc Claude Code đã config sẵn upstream model name
          (vd <code className="rounded bg-gray-100 px-1">gpt-5.4</code>, <code className="rounded bg-gray-100 px-1">claude-sonnet-4.6</code>),
          bạn CÓ THỂ gửi raw — Kandes tự forward. Alias <code className="rounded bg-gray-100 px-1">kandes-*</code> chỉ là
          convenience cho user copy-paste docs.
        </p>
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">Rate limits</h2>
        <p className="text-sm text-gray-600">
          Theo plan bạn mua — xem chi tiết trong <a href="/account/api-keys" className="text-blue-600 underline">API Keys</a> của bạn.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Starter: 60 requests / phút</li>
          <li>Pro: 300 requests / phút</li>
          <li>Business: 1000 requests / phút</li>
        </ul>
      </section>
    </div>
  )
}

function describeUseCase(family: string): string {
  switch (family) {
    case 'gpt-codex':
      return 'Codex CLI, code generation, completion'
    case 'gpt-codex-mini':
      return 'Codex CLI fast, simple task, giá rẻ'
    case 'gpt-pro':
      return 'GPT Pro tier, đa năng, vision'
    case 'claude-sonnet':
      return 'Claude Code, coding, phân tích tài liệu dài, writing'
    case 'claude-sonnet-pro':
      return 'Claude Sonnet 5 — reasoning cao cấp'
    case 'claude-opus':
      return 'Claude Opus — reasoning sâu, task phức tạp nhất'
    case 'claude-haiku':
      return 'Claude Haiku — nhanh, rẻ, task đơn giản'
    default:
      return ''
  }
}