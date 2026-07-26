import { test } from "node:test"
import assert from "node:assert/strict"

import { clientKey, createRateLimiter, rateLimitHeaders } from "./rate-limit"

/**
 * The limiter takes `now` explicitly, so time-dependent behaviour is asserted
 * directly rather than slept through.
 */

const T0 = 1_700_000_000_000

test("allows requests up to the limit and rejects the next one", () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })

  assert.equal(limiter.check("a", T0).ok, true)
  assert.equal(limiter.check("a", T0).ok, true)
  const last = limiter.check("a", T0)
  assert.equal(last.ok, true)
  assert.equal(last.remaining, 0)

  const blocked = limiter.check("a", T0)
  assert.equal(blocked.ok, false)
  assert.equal(blocked.remaining, 0)
})

test("counts each key separately", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })

  assert.equal(limiter.check("a", T0).ok, true)
  assert.equal(limiter.check("a", T0).ok, false)
  // One caller exhausting their allowance must not touch anyone else's.
  assert.equal(limiter.check("b", T0).ok, true)
})

test("a new window restores the full allowance", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 })

  limiter.check("a", T0)
  limiter.check("a", T0)
  assert.equal(limiter.check("a", T0 + 59_000).ok, false)
  // Same key, window elapsed.
  assert.equal(limiter.check("a", T0 + 60_001).ok, true)
})

test("retryAfterSeconds counts down within the window and never hits zero", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })

  limiter.check("a", T0)
  assert.equal(limiter.check("a", T0).retryAfterSeconds, 60)
  assert.equal(limiter.check("a", T0 + 30_000).retryAfterSeconds, 30)
  // A caller told to retry in 0s would retry immediately.
  assert.equal(limiter.check("a", T0 + 59_900).retryAfterSeconds, 1)
})

test("tracked keys stay bounded as callers churn", () => {
  const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 10 })

  for (let i = 0; i < 200; i += 1) limiter.check(`caller-${i}`, T0)
  assert.ok(limiter.size() <= 10, `held ${limiter.size()} keys`)
})

test("expired windows are reclaimed before live ones are evicted", () => {
  const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 4 })

  for (let i = 0; i < 4; i += 1) limiter.check(`old-${i}`, T0)
  // Long past their reset: the next arrival should reclaim these, not a live key.
  const later = T0 + 120_000
  limiter.check("fresh", later)
  assert.equal(limiter.size(), 1)
  assert.equal(limiter.check("fresh", later).remaining, 3)
})

test("reset clears one key or all of them", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })

  limiter.check("a", T0)
  limiter.check("b", T0)
  limiter.reset("a")
  assert.equal(limiter.check("a", T0).ok, true)
  assert.equal(limiter.check("b", T0).ok, false)

  limiter.reset()
  assert.equal(limiter.size(), 0)
})

// --- headers ----------------------------------------------------------------

test("rateLimitHeaders reports the window, and retry-after only when blocked", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })

  const allowed = rateLimitHeaders(limiter.check("a", T0))
  assert.equal(allowed["x-ratelimit-limit"], "1")
  assert.equal(allowed["x-ratelimit-remaining"], "0")
  assert.equal(allowed["retry-after"], undefined)

  const blocked = rateLimitHeaders(limiter.check("a", T0))
  assert.equal(blocked["retry-after"], "60")
  // Reset is reported in whole seconds, as the convention expects.
  assert.match(blocked["x-ratelimit-reset"], /^\d+$/)
})

// --- caller identity --------------------------------------------------------

test("clientKey takes the original client from x-forwarded-for", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" })
  assert.equal(clientKey(headers), "203.0.113.7")
})

test("clientKey falls back to x-real-ip, then to a shared bucket", () => {
  assert.equal(clientKey(new Headers({ "x-real-ip": "198.51.100.4" })), "198.51.100.4")
  // Unattributable traffic must share one allowance, not get a fresh one each time.
  assert.equal(clientKey(new Headers()), "unknown")
  assert.equal(clientKey(new Headers({ "x-forwarded-for": "  " })), "unknown")
})
