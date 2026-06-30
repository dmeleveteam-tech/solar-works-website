import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { z } from "zod"

import { env } from "@/lib/env"
import { leadsCollection, type LeadDoc } from "@/lib/leads"
import { notifyNewLead } from "@/lib/notifications"

/**
 * Public lead-ingest endpoint for the marketing site's contact form.
 *
 * The form posts here (server-to-server, via the landing app's own
 * `/api/leads` proxy) with a shared `x-ingest-key`. We never trust the caller
 * for anything privileged: the new lead always starts unassigned with status
 * "new", and the payload is fully validated. The caller may declare which
 * public channel it is ("website_form" or "chatbot") but cannot forge the
 * staff-only "manual" source. Spam/abuse controls (Turnstile, rate limiting)
 * live in front of this in the marketing app.
 */

// Bounded labelled extras (address, property type, goals, …). Caps keep a
// hostile caller from stuffing the document.
const detailsSchema = z.record(z.string().max(80), z.string().max(2000))

// Public channels a caller may legitimately declare. "manual" is staff-only and
// must never be settable through this endpoint.
const PUBLIC_SOURCES = ["website_form", "chatbot"] as const

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

export async function POST(req: Request) {
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
  const details = v.details && Object.keys(v.details).length ? v.details : null

  const now = new Date()
  const doc: LeadDoc = {
    _id: new ObjectId(),
    name: v.name,
    email: v.email ? v.email : null,
    phone: v.phone ? v.phone : null,
    message: v.message ? v.message : null,
    source: v.source,
    status: "new",
    assignedToId: null,
    assignedToName: null,
    details,
    createdAt: now,
    updatedAt: now,
  }

  await leadsCollection().insertOne(doc)

  // Fire-and-forget the sales alert; a notification failure must never affect
  // the captured lead or the response the marketing site sees.
  void notifyNewLead(doc)

  return NextResponse.json({ ok: true, id: doc._id.toString() }, { status: 201 })
}
