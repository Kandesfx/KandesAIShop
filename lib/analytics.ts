/**
 * Analytics — P7-07.
 *
 * Plausible analytics (privacy-first, GDPR-compliant, no cookies, no personal data).
 * Only enabled when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set.
 *
 * Usage:
 *   import { trackPageview, trackEvent } from '@/lib/analytics'
 *   trackPageview()    // in a client component useEffect
 *   trackEvent('signup')  // track conversion events
 *
 * If Plausible not configured, all calls are no-ops.
 */

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
const PLAUSIBLE_API = process.env.NEXT_PUBLIC_PLAUSIBLE_API ?? 'https://plausible.io/api/event'

/** Track page view. */
export function trackPageview(props?: { url?: string; referrer?: string }): void {
  if (!PLAUSIBLE_DOMAIN || typeof window === 'undefined') return
  const payload = {
    name: 'pageview',
    url: props?.url ?? window.location.href,
    referrer: props?.referrer ?? document.referrer,
  }
  sendPlausible(payload)
}

/** Track custom event. */
export function trackEvent(name: string, props?: Record<string, string | number>): void {
  if (!PLAUSIBLE_DOMAIN || typeof window === 'undefined') return
  sendPlausible({ name: 'custom', props: { ...props, url: window.location.href } })
}

function sendPlausible(payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify(payload)
    navigator.sendBeacon?.(`${PLAUSIBLE_API}/event`, new Blob([body], { type: 'application/json' }))
  } catch {
    // Analytics should never break the app
  }
}

/** Check if analytics is enabled. */
export function isAnalyticsEnabled(): boolean {
  return Boolean(PLAUSIBLE_DOMAIN)
}