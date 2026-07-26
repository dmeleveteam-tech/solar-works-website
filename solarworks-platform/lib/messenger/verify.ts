import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * `X-Hub-Signature-256` verification for Meta webhook deliveries.
 *
 * The old landing-app webhook (`app/api/facebook/webhook/route.ts`) did none of
 * this: the endpoint is publicly reachable and anyone who guessed the URL could
 * POST a fabricated `messaging` event and make the Page send whatever they
 * liked. Now that the same endpoint drives a model turn and can create a lead,
 * an unverified delivery is a lead-injection vector, not just a nuisance.
 *
 * CRITICAL: the HMAC is computed over the RAW request body bytes, exactly as
 * Meta serialized them. The caller MUST `await req.text()` and verify that
 * string, then `JSON.parse` it afterwards. Verifying against a re-serialized
 * object (`JSON.stringify(await req.json())`) silently fails for every real
 * delivery — key order, unicode escaping and whitespace all differ — and the
 * failure looks like "Meta is sending bad signatures", which is a miserable
 * afternoon.
 *
 * Deny by default: with no secret configured, verification always fails.
 *
 * Pure and dependency-free (the secret is a parameter, not an `env` import) so
 * it can be unit-tested without booting the whole server environment.
 */

const PREFIX = "sha256="

/**
 * True when `header` is a valid signature for `rawBody` under `appSecret`.
 *
 * `header` is the raw `X-Hub-Signature-256` value, i.e. `sha256=<hex digest>`.
 */
export function verifySignature(
  rawBody: string,
  header: string | null | undefined,
  appSecret: string | undefined | null,
): boolean {
  // Deny by default — an unconfigured bot must reject everything rather than
  // wave it through.
  if (!appSecret) return false
  if (!header || !header.startsWith(PREFIX)) return false

  const provided = header.slice(PREFIX.length).trim()
  if (!provided) return false

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")

  // Constant-time compare, tolerating differing lengths — same house pattern as
  // `keyMatches` in app/api/leads/route.ts. `timingSafeEqual` throws outright on
  // a length mismatch, so the length check has to come first; it leaks only the
  // length of a value the attacker already controls.
  const a = Buffer.from(provided, "utf8")
  const b = Buffer.from(expected, "utf8")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * The signature header Meta would send for this body — used by the tests, and
 * handy when replaying a captured delivery against a local tunnel.
 */
export function signBody(rawBody: string, appSecret: string): string {
  return `${PREFIX}${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`
}
