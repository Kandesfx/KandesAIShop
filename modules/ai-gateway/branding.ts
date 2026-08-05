/**
 * Brand abstraction layer - Phase 7-RB (D53).
 *
 * User-facing surface (KH only sees Kandes brand + kandes-* alias):
 *   - KANDES_BASE_URL: docs, email, UI copy.
 *   - KANDES_API_KEY_PREFIX: bearer token format check.
 * Internal surface (only providers use):
 *   - INTERNAL_UPSTREAM_BASE_URL
 *   - resolveUpstreamBaseUrl()
 */

export const KANDES_BASE_URL = 'https://api.kandes.shop/v1'
export const KANDES_BRAND = 'Kandes'
export const KANDES_API_KEY_PREFIX = 'ks-'

export const INTERNAL_UPSTREAM_BASE_URL = 'https://api.ccpro.cn/v1'

/**
 * Resolve base URL for the upstream provider.
 * NOT to be exported outside provider modules.
 */
export function resolveUpstreamBaseUrl(override?: string): string {
  return override ?? INTERNAL_UPSTREAM_BASE_URL
}

/**
 * Mask upstream URL for logs (D53, D59).
 * Replaces host portion with stars.
 */
export function maskUpstreamUrl(url: string): string {
  return url.replace(/\/\/[^/]+/, '//***')
}