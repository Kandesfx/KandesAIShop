import type { NotificationProvider } from '../types'
import { sendEmail } from '@/lib/email'

/**
 * Email provider — Phase 3.
 *
 * Wraps `lib/email.ts` so existing `EMAIL_PROVIDER=console|resend|ses` config still
 * drives behavior. The wrapper translates our generic send() contract to
 * `sendEmail()` (which already handles from/subject/text-or-html).
 */

class ConsoleEmailNotificationProvider implements NotificationProvider {
  channel = 'email' as const
  async send(args: { to: string; subject: string; html: string; text: string }): Promise<void> {
    await sendEmail({
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    })
  }
}

let _provider: NotificationProvider | null = null

export function getEmailProvider(): NotificationProvider {
  if (_provider) return _provider
  _provider = new ConsoleEmailNotificationProvider()
  return _provider
}

/** Test helper — swap provider. */
export function _setEmailProvider(provider: NotificationProvider | null): void {
  _provider = provider
}
