/**
 * A small fixed-window rate limiter for API routes.
 *
 * State lives in this process's memory. On Vercel that means the limit is per
 * serverless instance, not global: with N warm instances a determined caller
 * gets up to N x `limit`. That is fine for what this is for — damping runaway
 * polling loops, stuck retries and casual abuse — and it costs nothing per
 * request. If a hard global ceiling is ever needed (billing, quotas), the same
 * `check()` shape can be re-implemented over Redis or a Mongo counter without
 * touching the callers.
 *
 * Windows are fixed rather than sliding: a caller can send up to 2 x `limit`
 * across a window boundary. Deliberate — the alternative costs a timestamp list
 * per key, and the burst is harmless at these limits.
 *
 * Pure and dependency-free (`now` is injectable) so it can be unit-tested.
 */

export type RateLimitVerdict = {
  /** False when the request should be rejected with 429. */
  ok: boolean
  limit: number
  /** Requests still allowed in this window, after counting this one. */
  remaining: number
  /** Epoch ms at which the window resets. */
  resetAt: number
  /** Whole seconds until reset, for the `retry-after` header. Min 1. */
  retryAfterSeconds: number
}

export type RateLimiter = {
  check: (key: string, now?: number) => RateLimitVerdict
  /** Drop one key's window, or all of them. Used by tests. */
  reset: (key?: string) => void
  /** Number of tracked keys. Used by tests. */
  size: () => number
}

export type RateLimiterOptions = {
  /** Requests allowed per window. */
  limit: number
  /** Window length in ms. */
  windowMs: number
  /**
   * Cap on tracked keys, so a flood of distinct callers can't grow the map
   * without bound. Expired entries are dropped first; if that isn't enough the
   * windows closest to resetting are evicted.
   */
  maxKeys?: number
}

type Window = { count: number; resetAt: number }

const DEFAULT_MAX_KEYS = 10_000

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = DEFAULT_MAX_KEYS,
}: RateLimiterOptions): RateLimiter {
  const windows = new Map<string, Window>()

  /** Drop expired windows; if still over budget, evict the soonest to reset. */
  function evict(now: number): void {
    for (const [key, window] of windows) {
      if (window.resetAt <= now) windows.delete(key)
    }
    if (windows.size < maxKeys) return

    const bySoonestReset = [...windows.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt,
    )
    const excess = windows.size - maxKeys + 1
    for (let i = 0; i < excess; i += 1) windows.delete(bySoonestReset[i][0])
  }

  return {
    check(key, now = Date.now()) {
      let window = windows.get(key)

      if (!window || window.resetAt <= now) {
        if (windows.size >= maxKeys) evict(now)
        window = { count: 0, resetAt: now + windowMs }
        windows.set(key, window)
      }

      window.count += 1

      return {
        ok: window.count <= limit,
        limit,
        remaining: Math.max(0, limit - window.count),
        resetAt: window.resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
      }
    },

    reset(key) {
      if (key === undefined) windows.clear()
      else windows.delete(key)
    },

    size() {
      return windows.size
    },
  }
}

/** Standard rate-limit headers for a response, blocked or not. */
export function rateLimitHeaders(verdict: RateLimitVerdict): Record<string, string> {
  const headers: Record<string, string> = {
    "x-ratelimit-limit": String(verdict.limit),
    "x-ratelimit-remaining": String(verdict.remaining),
    "x-ratelimit-reset": String(Math.ceil(verdict.resetAt / 1000)),
  }
  if (!verdict.ok) headers["retry-after"] = String(verdict.retryAfterSeconds)
  return headers
}

/**
 * A rate-limit key for an unauthenticated caller, from the proxy headers Vercel
 * sets. Falls back to a shared bucket when no address is present, which is the
 * safe direction: unattributable traffic shares one allowance instead of each
 * request looking like a brand-new caller.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  const first = forwarded?.split(",")[0]?.trim()
  return first || headers.get("x-real-ip")?.trim() || "unknown"
}
