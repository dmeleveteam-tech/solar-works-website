/**
 * First-touch marketing attribution (spec L-04 / QA-07). Captures the UTM
 * parameters and landing page from the first URL a visitor opens in a session
 * and keeps them in sessionStorage, so they survive client-side navigation to
 * the contact form or a chatbot conversation. The values are attached to a lead
 * only when the visitor submits one — they are first-party and tied to that
 * explicit action, so capture does not depend on analytics-cookie consent.
 *
 * Client-only: every function no-ops on the server.
 */

const STORAGE_KEY = "sw-attribution"

/** UTM keys we recognise, mirroring the spec's Lead DB columns. */
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const

const MAX_VALUE = 300

/** Labelled attribution pairs, e.g. `{ utm_source: "facebook", landing_page: "/" }`. */
export type Attribution = Record<string, string>

/**
 * Record attribution from the current URL once per session (first touch wins),
 * so a later landing without UTM params doesn't overwrite the original source.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY)) return

    const params = new URLSearchParams(window.location.search)
    const data: Attribution = {}
    for (const key of UTM_KEYS) {
      const value = params.get(key)?.trim()
      if (value) data[key] = value.slice(0, MAX_VALUE)
    }
    data.landing_page = (window.location.pathname + window.location.search).slice(0, MAX_VALUE)
    const referrer = document.referrer?.trim()
    if (referrer) data.referrer = referrer.slice(0, MAX_VALUE)

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Private mode / disabled storage — attribution is best-effort, never fatal.
  }
}

/** Read the stored attribution pairs (empty object when none/unavailable). */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    const out: Attribution = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v) out[k] = v.slice(0, MAX_VALUE)
    }
    return out
  } catch {
    return {}
  }
}
