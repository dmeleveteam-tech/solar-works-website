import { test } from "node:test"
import assert from "node:assert/strict"

import { createTtlCache } from "./ttl-cache"

const T0 = 1_700_000_000_000

test("returns a stored value until it expires", () => {
  const cache = createTtlCache<string>({ ttlMs: 10_000 })

  cache.set("a", "value", T0)
  assert.equal(cache.get("a", T0), "value")
  assert.equal(cache.get("a", T0 + 9_999), "value")
  assert.equal(cache.get("a", T0 + 10_000), undefined)
})

test("an expired entry is dropped, not just hidden", () => {
  const cache = createTtlCache<string>({ ttlMs: 1_000 })

  cache.set("a", "value", T0)
  cache.get("a", T0 + 2_000)
  assert.equal(cache.size(), 0)
})

test("a miss is indistinguishable from an unset key", () => {
  const cache = createTtlCache<string>({ ttlMs: 1_000 })
  assert.equal(cache.get("never-set", T0), undefined)
})

test("setting again replaces the value and restarts its life", () => {
  const cache = createTtlCache<string>({ ttlMs: 10_000 })

  cache.set("a", "first", T0)
  cache.set("a", "second", T0 + 5_000)
  assert.equal(cache.get("a", T0 + 12_000), "second")
  assert.equal(cache.size(), 1)
})

test("delete and clear remove entries", () => {
  const cache = createTtlCache<string>({ ttlMs: 10_000 })

  cache.set("a", "1", T0)
  cache.set("b", "2", T0)
  cache.delete("a")
  assert.equal(cache.get("a", T0), undefined)
  assert.equal(cache.get("b", T0), "2")

  cache.clear()
  assert.equal(cache.size(), 0)
})

test("size stays within maxEntries under churn", () => {
  const cache = createTtlCache<number>({ ttlMs: 60_000, maxEntries: 5 })

  for (let i = 0; i < 100; i += 1) cache.set(`k${i}`, i, T0)
  assert.ok(cache.size() <= 5, `held ${cache.size()} entries`)
  // The most recent writes survive; the oldest are evicted first.
  assert.equal(cache.get("k99", T0), 99)
  assert.equal(cache.get("k0", T0), undefined)
})

test("expired entries are reclaimed before live ones are evicted", () => {
  const cache = createTtlCache<number>({ ttlMs: 1_000, maxEntries: 3 })

  cache.set("old-1", 1, T0)
  cache.set("old-2", 2, T0)
  cache.set("old-3", 3, T0)

  const later = T0 + 5_000
  cache.set("fresh", 4, later)
  assert.equal(cache.size(), 1)
  assert.equal(cache.get("fresh", later), 4)
})
