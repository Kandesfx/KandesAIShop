/**
 * Email capture helper — Phase 2 P2-06.
 *
 * Trong test, email provider mặc định là "console" (ghi qua logger).
 * Helper này capture các log entries có `email` payload để assert.
 *
 * Bypass cách tiếp cận: subscribe tới logger transport trong test mode,
 * collect entries có `to` field.
 */

import { vi } from 'vitest'

type CapturedEmail = {
  to: string
  subject: string
  text: string
  html?: string
}

let captured: CapturedEmail[] = []

/**
 * Install capture: monkey-patch console để pick ra log lines có
 * `{ to, subject, text }` (format của lib/email console provider).
 */
export function startEmailCapture(): { getEmails: () => CapturedEmail[]; clear: () => void } {
  captured = []
  return {
    getEmails: () => [...captured],
    clear: () => {
      captured = []
    },
  }
}

/**
 * Mock provider để inject email vào capture store.
 * Cài vào: vi.mock('@/lib/email', () => ({ ...mockEmail }))
 */
export const mockEmail = {
  sendEmail: vi.fn(async (opts: { to: string; subject: string; text: string; html?: string }) => {
    captured.push({ to: opts.to, subject: opts.subject, text: opts.text, html: opts.html })
    return { ok: true } as const
  }),
  isEmailConfigured: () => false,
  getEmailProvider: () => 'console' as const,
}