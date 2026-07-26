import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Meta's `signed_request` — the payload format used by the Data Deletion
 * Request and Deauthorize callbacks.
 *
 * It is NOT the webhook's `X-Hub-Signature-256` scheme (see `./verify.ts`).
 * Meta POSTs a form-encoded body with a single `signed_request` field shaped
 * `<signature>.<payload>`, where both halves are base64url and the signature is
 * an HMAC-SHA256 of the *encoded payload string* — not of the decoded JSON, and
 * not of the whole request body. Signing the decoded object instead is the
 * classic way to get this wrong; every real request then looks forged.
 *
 * Deny by default: with no app secret configured, nothing verifies.
 *
 * Pure and dependency-free (secret is a parameter, not an `env` import) so the
 * tests can run without the server environment.
 */

export type SignedRequestPayload = {
  /** The PSID whose data the request concerns. */
  user_id?: string
  algorithm?: string
  issued_at?: number
}

/** base64url → Buffer. Node's "base64url" decoder handles the missing padding. */
const decode = (part: string): Buffer => Buffer.from(part, "base64url")

/**
 * Verify and decode a `signed_request`. Returns null when it is malformed, uses
 * an algorithm we don't accept, or the signature doesn't match — the caller must
 * treat all three identically and refuse to delete anything, since acting on an
 * unverified request would let anyone erase another person's conversation.
 */
export function parseSignedRequest(
  signedRequest: string | null | undefined,
  appSecret: string | undefined | null,
): SignedRequestPayload | null {
  if (!appSecret || !signedRequest) return null

  const dot = signedRequest.indexOf(".")
  if (dot <= 0 || dot === signedRequest.length - 1) return null

  const encodedSignature = signedRequest.slice(0, dot)
  // The payload is verified in its ENCODED form — re-encoding the parsed object
  // would not reproduce these bytes.
  const encodedPayload = signedRequest.slice(dot + 1)

  let payload: SignedRequestPayload
  try {
    payload = JSON.parse(decode(encodedPayload).toString("utf8")) as SignedRequestPayload
  } catch {
    return null
  }

  // Meta has only ever sent HMAC-SHA256 here, and accepting whatever the caller
  // names would let them downgrade us to an algorithm we can forge.
  if (payload.algorithm?.toUpperCase() !== "HMAC-SHA256") return null

  const expected = createHmac("sha256", appSecret).update(encodedPayload, "utf8").digest()
  const provided = decode(encodedSignature)

  // `timingSafeEqual` throws on a length mismatch, so check length first; it
  // leaks only the length of a value the caller already controls.
  if (provided.length !== expected.length) return null
  if (!timingSafeEqual(provided, expected)) return null

  return payload
}

/** Build a `signed_request` — used by the tests and for replaying locally. */
export function buildSignedRequest(payload: SignedRequestPayload, appSecret: string): string {
  const encodedPayload = Buffer.from(
    JSON.stringify({ algorithm: "HMAC-SHA256", ...payload }),
    "utf8",
  ).toString("base64url")
  const signature = createHmac("sha256", appSecret)
    .update(encodedPayload, "utf8")
    .digest()
    .toString("base64url")
  return `${signature}.${encodedPayload}`
}
