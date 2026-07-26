import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { env } from "@/lib/env"
import { createLead } from "@/lib/leads-ingest"
import { clientKey, createRateLimiter, rateLimitHeaders } from "@/lib/rate-limit"

/**
 * Public lead-ingest endpoint for the marketing site's contact form.
 *
 * The form posts here (server-to-server, via the landing app's own
 * `/api/leads` proxy) with a shared `x-ingest-key`. We never trust the caller
 * for anything privileged: the new lead always starts unassigned with status
 * "new", and the payload is fully validated. The caller may declare which
 * public channel it is ("website_form", "chatbot" or "messenger") but cannot
 * forge the staff-only "manual" source. The marketing app screens submissions in
 * front of this (Turnstile, its own limiting); the limit below is a backstop on
 * the endpoint itself, so a leaked ingest key or a stuck retry loop can't write
 * unbounded. It sits before the key check because rejecting floods cheaply is
 * the point — real ingest volume is nowhere near it.
 *
 * The write itself lives in `lib/leads-ingest.ts`, so the in-app chat brain can
 * create a lead directly instead of HTTP-ing back into this same app. This route
 * is auth + validate + call, and nothing else.
 */

// Bounded labelled extras (address, property type, goals, …). Caps keep a
// hostile caller from stuffing the document.
const detailsSchema = z.record(z.string().max(80), z.string().max(2000))

// Public channels a caller may legitimately declare. "manual" is staff-only and
// must never be settable through this endpoint.
const PUBLIC_SOURCES = ["website_form", "chatbot", "messenger"] as const

const ingestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(5000).optional().or(z.literal("")),
  details: detailsSchema.optional(),
  source: z.enum(PUBLIC_SOURCES).default("website_form"),
})

/** Constant-time key comparison that tolerates differing lengths. */
function keyMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 })

export async function POST(req: Request) {
  const verdict = limiter.check(clientKey(req.headers))
  if (!verdict.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: rateLimitHeaders(verdict) },
    )
  }

  if (!env.LEADS_INGEST_KEY) {
    // Deny by default: no key configured means the endpoint is closed.
    return NextResponse.json(
      { ok: false, error: "Lead ingest is not configured." },
      { status: 503 },
    )
  }
  if (!keyMatches(req.headers.get("x-ingest-key"), env.LEADS_INGEST_KEY)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = ingestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid lead." }, { status: 422 })
  }
  const v = parsed.data

  const { id } = await createLead({
    name: v.name,
    email: v.email,
    phone: v.phone,
    message: v.message,
    details: v.details,
    source: v.source,
  })

  return NextResponse.json({ ok: true, id }, { status: 201 })
}
