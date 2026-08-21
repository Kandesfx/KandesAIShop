import { describe, it, expect, beforeEach } from 'vitest'
import { getEmailProvider, _resetEmailProvider, otpEmail } from '@/lib/email'

/**
 * D74 — email provider tests.
 *
 * Limitation: `lib/env.ts` parses process.env at module-load và caches `env`
 * immutable. We can't mock `env.EMAIL_PROVIDER` sau khi import. Test trực tiếp
 * cho `case 'resend'` yêu cầu mock module — out of scope cho unit test.
 *
 * Chi cover:
 *   - console provider → log ra stdout (idempotent, no crash)
 *   - otpEmail format đúng (subject, html, text)
 *
 * Production fail-fast logic ở `getEmailProvider('resend')` không có
 * RESEND_API_KEY được verify bằng `tsc --noEmit` (type check) + manual
 * integration test (requires RESEND key).
 */

describe('email provider', () => {
  beforeEach(() => {
    _resetEmailProvider()
  })

  it('console provider log ra stdout', async () => {
    _resetEmailProvider()
    const provider = getEmailProvider()
    expect(provider).toBeDefined()
    await expect(
      provider.send({ to: 'a@b.com', subject: 'test', html: '<p>hi</p>' })
    ).resolves.toBeUndefined()
  })

  it('otpEmail format có placeholder code', () => {
    const tpl = otpEmail('123456', 'login')
    expect(tpl.subject.toLowerCase()).toContain('đăng nhập')
    expect(tpl.html).toContain('123456')
    expect(tpl.text).toContain('123456')
    expect(tpl.text).toContain('10 phút')
  })
})
