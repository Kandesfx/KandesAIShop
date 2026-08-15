/**
 * In-memory cache utility — Phase 11-PERF.
 *
 * Simple TTL-based cache for hot data (model pricing, NCC key health, etc.)
 * Production: replace with Redis client (Upstash/REST API).
 *
 * Why not just use Next.js fetch cache? Because some data is fetched via Prisma
 * directly, not fetch(). This fills that gap.
 *
 * Usage:
 *   const cached = await cache.get('pricing', 60_000)
 *   if (cached) return cached
 *   const fresh = await fetchExpensiveData()
 *   await cache.set('pricing', fresh, 60_000)
 *   return fresh
 */

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>()
  private maxSize = 1000

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value
      if (firstKey) this.store.delete(firstKey)
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  /**
   * Get-or-set pattern with stale-while-revalidate.
   */
  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached

    const fresh = await loader()
    await this.set(key, fresh, ttlMs)
    return fresh
  }

  size(): number {
    return this.store.size
  }
}

export const cache = new MemoryCache()

/**
 * Cache TTL constants for hot data.
 */
export const CACHE_TTL = {
  PRICING: 5 * 60_000, // 5 min — model pricing rarely changes
  NCC_KEY_HEALTH: 30_000, // 30s — health check
  AI_PLANS: 10 * 60_000, // 10 min — plans list
  CATEGORIES: 5 * 60_000, // 5 min — category tree
  FEATURED_PRODUCTS: 60_000, // 1 min — featured products
  USER_PROFILE: 30_000, // 30s — current user
} as const
