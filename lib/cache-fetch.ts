/**
 * Cache helpers — Phase 11-PERF.
 *
 * Drop-in `cacheFetch()` wrapper for `fetch()` that adds Next.js cache tags.
 * Use in Server Components and Route Handlers.
 *
 * Example:
 *   const data = await cacheFetch('https://api.example.com/v1/models', {
 *     next: { revalidate: 300, tags: ['models'] },
 *   })
 */

type FetchOptions = RequestInit & {
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

/**
 * Wrapped fetch with logging + cache tags.
 */
export async function cacheFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const start = Date.now()
  const resp = await fetch(url, options)
  const elapsed = Date.now() - start

  // Lightweight log; production: send to Datadog/Sentry
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[cacheFetch] ${url} ${resp.status} (${elapsed}ms)`)
  }

  return resp
}

/**
 * Helpers to invalidate cache tags.
 * Use after mutations (create/update/delete) to bust stale data.
 */
export const CACHE_TAGS = {
  PRODUCTS: 'products',
  PRODUCT: (id: string) => `product:${id}`,
  CATEGORIES: 'categories',
  CATEGORY: (id: string) => `category:${id}`,
  USERS: 'users',
  USER: (id: string) => `user:${id}`,
  ORDERS: 'orders',
  ORDER: (id: string) => `order:${id}`,
  AI_PLANS: 'ai-plans',
  AI_API_KEYS: 'ai-api-keys',
  AI_USAGE: 'ai-usage',
  PRICING: 'pricing',
  NCC_KEYS: 'ncc-keys',
  AI_HEALTH: 'ai-health',
} as const

/**
 * Server-side cache revalidation helper.
 * Use after mutations that affect cached data.
 */
export async function revalidateTag(tag: string): Promise<void> {
  const { revalidateTag: nextRevalidateTag } = await import('next/cache')
  nextRevalidateTag(tag)
}
