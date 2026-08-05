import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { getEmailProvider } from '@/modules/notification/providers/email'
import { KANDES_BASE_URL, KANDES_API_KEY_PREFIX } from './branding'
import { MODEL_ALIASES } from './models'

/**
 * AI key delivered email — Phase 6 P6-11 + Phase 7-RB (D53, D54).
 *
 * Brand sạch Kandes — KHÔNG reference NCC upstream URL hay key prefix.
 * Alias `kandes-*` mới theo D54.
 */
export type ApiKeyDeliveredEmailInput = {
  to: string
  userName: string
  planName: string
  apiKeyId: string
  plaintextToken: string
  expiresAt: Date
  baseUrl: string
}

const BRAND = 'Kandes'

/** Public API base URL KH dùng — đồng nhất với docs (D53). */
function buildApiBase(): string {
  return KANDES_BASE_URL
}

export async function sendApiKeyDeliveredEmail(input: ApiKeyDeliveredEmailInput): Promise<void> {
  const subject = `[${BRAND}] API Key AI của bạn đã sẵn sàng`
  const html = renderEmail(input)
  const text = renderPlainText(input)

  await getEmailProvider().send({
    to: input.to,
    subject,
    html,
    text,
  })

  logger.info(
    { apiKeyId: input.apiKeyId, to: maskEmail(input.to) },
    'ai-gateway: API key delivered email sent'
  )
}

function renderEmail(input: ApiKeyDeliveredEmailInput): string {
  const expiresStr = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(input.expiresAt)

  const apiBase = buildApiBase()
  const aliasList = MODEL_ALIASES.map((m) => `<code>${m.alias}</code>`).join(', ')

  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fafafa;margin:0;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #eee;">
      <div style="padding:16px 20px;border-bottom:1px solid #eee;color:#111;font-weight:600;">${BRAND} · API Key đã sẵn sàng</div>
      <div style="padding:20px;color:#222;font-size:14px;line-height:1.5;">
        <p>Chào <strong>${escapeHtml(input.userName)}</strong>,</p>
        <p>Cảm ơn bạn đã mua gói <strong>${escapeHtml(input.planName)}</strong>. API key của bạn đã sẵn sàng — sử dụng để gọi AI qua ${BRAND}.</p>
        <p style="margin:16px 0 6px;color:#666;font-size:13px;">API key (lưu lại ngay — chỉ hiển thị 1 lần):</p>
        <pre style="background:#f4f4f5;border:1px solid #e5e5e5;padding:12px 14px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:13px;overflow:auto;margin:0 0 16px;color:#111;">${escapeHtml(input.plaintextToken)}</pre>
        <p style="margin:0 0 6px;color:#666;font-size:13px;">Endpoint:</p>
        <pre style="background:#f4f4f5;border:1px solid #e5e5e5;padding:12px 14px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:13px;overflow:auto;margin:0 0 16px;color:#111;">${escapeHtml(apiBase)}</pre>
        <p style="margin:0 0 6px;color:#666;font-size:13px;">Models khả dụng (dùng alias hoặc raw upstream name):</p>
        <p style="font-size:12px;color:#555;line-height:1.7;">${aliasList}</p>
        <p style="margin:0 0 6px;color:#666;font-size:13px;">Ví dụ curl (chat/completions):</p>
        <pre style="background:#f4f4f5;border:1px solid #e5e5e5;padding:12px 14px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:12px;overflow:auto;margin:0 0 16px;color:#111;">curl -X POST ${escapeHtml(apiBase)}/chat/completions \\
  -H "Authorization: Bearer ${escapeHtml(input.plaintextToken)}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"kandes-claude","messages":[{"role":"user","content":"Xin chào"}]}'</pre>
        <p style="margin:0 0 6px;color:#666;font-size:13px;">Claude Code:</p>
        <pre style="background:#f4f4f5;border:1px solid #e5e5e5;padding:12px 14px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:12px;overflow:auto;margin:0 0 16px;color:#111;">export ANTHROPIC_BASE_URL="${escapeHtml(apiBase)}"
export ANTHROPIC_AUTH_TOKEN="${escapeHtml(input.plaintextToken)}"</pre>
        <p style="margin:0 0 6px;color:#666;font-size:13px;">Codex CLI:</p>
        <pre style="background:#f4f4f5;border:1px solid #e5e5e5;padding:12px 14px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:12px;overflow:auto;margin:0 0 16px;color:#111;">setx OPENAI_BASE_URL "${escapeHtml(apiBase)}"
setx OPENAI_API_KEY "${escapeHtml(input.plaintextToken)}"</pre>
        <p style="margin:16px 0 0;color:#888;font-size:12px;">Key có hạn đến <strong>${escapeHtml(expiresStr)}</strong>.</p>
        <p style="margin:8px 0 0;">
          <a href="https://${env.APP_URL.replace(/^https?:\/\//, '')}/docs/api"
             style="display:inline-block;padding:8px 14px;border:1px solid #111;color:#111;text-decoration:none;font-size:13px;">
            Xem tài liệu API
          </a>
        </p>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #eee;color:#888;font-size:12px;">
        Email tự động — không reply trực tiếp.
      </div>
    </div>
  </body></html>`
}

function renderPlainText(input: ApiKeyDeliveredEmailInput): string {
  const apiBase = buildApiBase()
  const aliasList = MODEL_ALIASES.map((m) => m.alias).join(', ')
  return [
    `Chào ${input.userName},`,
    ``,
    `Cảm ơn bạn đã mua gói ${input.planName}.`,
    ``,
    `API key (lưu lại ngay — chỉ hiển thị 1 lần):`,
    input.plaintextToken,
    ``,
    `Endpoint: ${apiBase}`,
    `Key prefix: ${KANDES_API_KEY_PREFIX}-...`,
    `Models (alias): ${aliasList}`,
    ``,
    `Ví dụ curl:`,
    `curl -X POST ${apiBase}/chat/completions \\`,
    `  -H "Authorization: Bearer ${input.plaintextToken}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"model":"kandes-claude","messages":[{"role":"user","content":"Xin chào"}]}'`,
    ``,
    `Claude Code:`,
    `export ANTHROPIC_BASE_URL="${apiBase}"`,
    `export ANTHROPIC_AUTH_TOKEN="${input.plaintextToken}"`,
    ``,
    `Codex CLI (PowerShell):`,
    `setx OPENAI_BASE_URL "${apiBase}"`,
    `setx OPENAI_API_KEY "${input.plaintextToken}"`,
    ``,
    `Hạn: ${input.expiresAt.toISOString()}`,
    `Docs: ${env.APP_URL}/docs/api`,
  ].join('\n')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function maskEmail(email: string): string {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const localMask = local.length <= 2 ? '**' : `${local.slice(0, 2)}***`
  return `${localMask}@${domain}`
}