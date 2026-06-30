/**
 * Server-side lead forwarding. Both the contact form proxy (`/api/leads`) and
 * the AI chatbot (`/api/chat`) capture leads, but only this module knows the
 * platform's ingest URL and shared key — keeping them out of the browser and in
 * exactly one place. The canonical payload shape matches the platform's
 * `ingestSchema`.
 *
 * This file must only be imported from server code (route handlers).
 */

/** Public channel a lead came from. Mirrors the platform's accepted sources. */
export type LeadSource = "website_form" | "chatbot"

/** Canonical lead shape forwarded to the platform ingest endpoint. */
export type LeadPayload = {
  name: string
  phone: string
  email?: string
  message?: string
  /** Labelled free-form extras (address, property type, goals, …). */
  details?: Record<string, string>
  source: LeadSource
}

export type ForwardResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

const PLATFORM_INGEST_URL = process.env.PLATFORM_INGEST_URL
const LEADS_INGEST_KEY = process.env.LEADS_INGEST_KEY

/** Whether lead capture is wired up at all (URL + shared key present). */
export function leadIntakeConfigured(): boolean {
  return Boolean(PLATFORM_INGEST_URL && LEADS_INGEST_KEY)
}

/**
 * Forward a lead to the platform, server-to-server, with the shared ingest key.
 * Never throws and never leaks the platform's internals to the caller; failures
 * come back as a safe `{ ok: false }` with a visitor-friendly message.
 */
export async function forwardLead(payload: LeadPayload): Promise<ForwardResult> {
  if (!PLATFORM_INGEST_URL || !LEADS_INGEST_KEY) {
    return { ok: false, status: 503, error: "Lead intake is not configured yet." }
  }

  try {
    const res = await fetch(PLATFORM_INGEST_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ingest-key": LEADS_INGEST_KEY,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
    if (!res.ok) {
      console.error("Lead forward failed:", res.status, await res.text().catch(() => ""))
      return {
        ok: false,
        status: 502,
        error: "We couldn't submit your request. Please try again.",
      }
    }
    return { ok: true }
  } catch (err) {
    console.error("Lead forward error:", err)
    return {
      ok: false,
      status: 502,
      error: "We couldn't reach our servers. Please try again.",
    }
  }
}
