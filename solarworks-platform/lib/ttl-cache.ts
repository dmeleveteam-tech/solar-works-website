/**
 * A tiny in-memory cache with per-entry expiry and a bounded size.
 *
 * Same caveat as the rate limiter: this is per-process, so on serverless each
 * warm instance keeps its own copy. That makes it suitable only for data where
 * a few seconds of staleness is acceptable and correctness never depends on a
 * hit — every caller must be able to fall through to the real read.
 *
 * Eviction is insertion-ordered (Map iteration order): expired entries go
 * first, then the oldest. Pure and `now`-injectable so it can be unit-tested.
 */

export type TtlCache<T> = {
  get: (key: string, now?: number) => T | undefined
  set: (key: string, value: T, now?: number) => void
  delete: (key: string) => void
  clear: () => void
  size: () => number
}

export type TtlCacheOptions = {
  /** How long an entry stays fresh, in ms. */
  ttlMs: number
  /** Hard cap on entries held at once. */
  maxEntries?: number
}

const DEFAULT_MAX_ENTRIES = 500

export function createTtlCache<T>({
  ttlMs,
  maxEntries = DEFAULT_MAX_ENTRIES,
}: TtlCacheOptions): TtlCache<T> {
  const entries = new Map<string, { value: T; expiresAt: number }>()

  return {
    get(key, now = Date.now()) {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (entry.expiresAt <= now) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },

    set(key, value, now = Date.now()) {
      // Re-inserting moves the key to the end of the eviction order.
      entries.delete(key)

      if (entries.size >= maxEntries) {
        for (const [k, entry] of entries) {
          if (entry.expiresAt <= now) entries.delete(k)
        }
        while (entries.size >= maxEntries) {
          const oldest = entries.keys().next()
          if (oldest.done) break
          entries.delete(oldest.value)
        }
      }

      entries.set(key, { value, expiresAt: now + ttlMs })
    },

    delete(key) {
      entries.delete(key)
    },

    clear() {
      entries.clear()
    },

    size() {
      return entries.size
    },
  }
}
