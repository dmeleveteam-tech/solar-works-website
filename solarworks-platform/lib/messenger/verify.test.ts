import { test } from "node:test"
import assert from "node:assert/strict"

import { signBody, verifySignature } from "./verify"

/**
 * The secret is a parameter rather than an `env` import precisely so these can
 * run without a server environment — and so "unconfigured" is a case we can
 * assert on rather than hope about.
 */

const SECRET = "test-app-secret"
const BODY = '{"object":"page","entry":[{"messaging":[{"sender":{"id":"123"}}]}]}'

test("a signature Meta would send verifies", () => {
  assert.equal(verifySignature(BODY, signBody(BODY, SECRET), SECRET), true)
})

test("a tampered body fails", () => {
  const header = signBody(BODY, SECRET)
  // One character changed — the PSID an attacker would want to swap.
  const tampered = BODY.replace('"123"', '"456"')
  assert.notEqual(tampered, BODY)
  assert.equal(verifySignature(tampered, header, SECRET), false)
})

test("a signature from a different secret fails", () => {
  assert.equal(verifySignature(BODY, signBody(BODY, "someone-elses-secret"), SECRET), false)
})

test("a missing header fails", () => {
  assert.equal(verifySignature(BODY, null, SECRET), false)
  assert.equal(verifySignature(BODY, undefined, SECRET), false)
  assert.equal(verifySignature(BODY, "", SECRET), false)
})

test("a malformed header fails without throwing", () => {
  // timingSafeEqual throws on a length mismatch, so these must be rejected
  // before it is reached.
  assert.equal(verifySignature(BODY, "sha256=", SECRET), false)
  assert.equal(verifySignature(BODY, "sha256=deadbeef", SECRET), false)
  assert.equal(verifySignature(BODY, "sha1=whatever", SECRET), false)
  // No prefix at all, but the right digest length.
  const bare = signBody(BODY, SECRET).slice("sha256=".length)
  assert.equal(verifySignature(BODY, bare, SECRET), false)
})

test("an unconfigured secret denies everything", () => {
  // Deny by default. Without this, a deploy missing FB_APP_SECRET would accept
  // forged deliveries from anyone who guessed the URL.
  assert.equal(verifySignature(BODY, signBody(BODY, SECRET), undefined), false)
  assert.equal(verifySignature(BODY, signBody(BODY, SECRET), ""), false)
  assert.equal(verifySignature(BODY, signBody(BODY, SECRET), null), false)
})

test("verification is over the raw bytes, not a re-serialized object", () => {
  // The bug this guards: JSON.stringify(JSON.parse(raw)) is a DIFFERENT string
  // whenever Meta's key order or escaping differs from V8's, so a route that
  // verifies the round-tripped body rejects every genuine delivery.
  const spaced = '{"object": "page", "entry": []}'
  const header = signBody(spaced, SECRET)
  assert.equal(verifySignature(spaced, header, SECRET), true)
  assert.equal(verifySignature(JSON.stringify(JSON.parse(spaced)), header, SECRET), false)
})
