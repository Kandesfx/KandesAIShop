import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEmailProvider, _resetEmailProvider, otpEmail } from '@/lib/email'

describe('email provider', () => {
  beforeEach(() => {
    _resetEmailProvider()
    vi.resetModules()
  })

  it('console provider log ra stdout', async () => {
    process.env.EMAIL_PROVIDER = 'console'
    _resetEmailProvider()
    const provider = getEmailProvider()
    expect(provider).toBeDefined()
    await expect(
      provider.send({ to: 'a@b.com', subject: 'test', html: '<p>hi</p>' })
    ).resolves.toBeUndefined()
  })

  it('otpEmail format có placeholder code', () => {
    const tpl = otpEmail('123456', 'login')
    expect(tpl.subject).toContain('đăng nhập')
    expect(tpl.html).toContain('123456')
    expect(tpl.text).toContain('123456')
    expect(tpl.text).toContain('10 phút')
  })
})
