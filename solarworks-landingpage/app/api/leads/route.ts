import { NextResponse } from "next/server"

import { forwardLead, leadIntakeConfigured } from "@/lib/leads"

/**
 * Same-origin proxy for the contact form. The browser posts the raw form shape
 * here; we map it to the platform's canonical lead shape and forward it
 * server-to-server with the shared ingest key. Keeping this on the server means
 * the platform URL and key never reach the browser, and there's no CORS hop.
 */

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY

type FormBody = {
  fullName?: string
  mobile?: string
  email?: string
  address?: { barangay?: string; city?: string; province?: string }
  propertyType?: string
  solutionInterest?: string
  monthlyBill?: string
  monthlyKwh?: string
  goals?: string[]
  /** Daytime vs nighttime consumption split. */
  usageProfile?: string
  batteryInterest?: string
  urgency?: string
  contactTime?: string
  /** Name and size of the bill the visitor attached, if any. */
  billAttachment?: string
  utilityProvider?: string
  leadSource?: string
  siteNotes?: string
  contactMethod?: string
  /** The visitor ticked the privacy-notice consent box. Must be literally true. */
  consent?: boolean
  turnstileToken?: string
  attribution?: Record<string, unknown>
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

// Marketing attribution keys we accept from the browser (L-04). Anything else
// in the attribution object is ignored, so a hostile client can't stuff the
// lead document via this field.
const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "landing_page",
  "referrer",
] as const

/**
 * Verify a Cloudflare Turnstile token (NFR-02). Returns true when verification
 * is not configured, so the form keeps working in environments without keys.
 */
async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) return true
  if (!token) return false
  try {
    const form = new URLSearchParams()
    form.set("secret", TURNSTILE_SECRET_KEY)
    form.set("response", token)
    if (ip) form.set("remoteip", ip)
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form, cache: "no-store" },
    )
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (err) {
    console.error("Turnstile verify error:", err)
    return false
  }
}

export async function POST(req: Request) {
  if (!leadIntakeConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Lead intake is not configured yet." },
      { status: 503 },
    )
  }

  let body: FormBody
  try {
    body = (await req.json()) as FormBody
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 })
  }

  const name = str(body.fullName)
  const phone = str(body.mobile)
  if (name.length < 2 || !phone) {
    return NextResponse.json(
      { ok: false, error: "Name and mobile number are required." },
      { status: 422 },
    )
  }

  /**
   * The consent gate. Both forms disable submission until the box is ticked,
   * but that check lives in the browser and anyone can post straight here — so
   * this is where consent is actually enforced. `=== true` is deliberate: a
   * missing field, "false", or a truthy string all fail closed.
   *
   * This is the spec's requirement that a lead is only stored and notified on
   * after consent is recorded. The chatbot has its own equivalent gate in
   * `save_lead` (platform `lib/chat/brain.ts`).
   */
  if (body.consent !== true) {
    return NextResponse.json(
      { ok: false, error: "Please agree to the Privacy Notice before submitting." },
      { status: 422 },
    )
  }

  // Spam gate before we touch the platform. The header is set by the hosting
  // edge (Vercel/Cloudflare); fall back to null when absent.
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  if (!(await verifyTurnstile(str(body.turnstileToken), ip))) {
    return NextResponse.json(
      { ok: false, error: "Spam check failed. Please try again." },
      { status: 403 },
    )
  }

  // Fold the structured extras into labelled detail pairs, dropping blanks.
  const details: Record<string, string> = {}
  const put = (label: string, value: unknown) => {
    const s = Array.isArray(value)
      ? value.map(str).filter(Boolean).join(", ")
      : str(value)
    if (s) details[label] = s
  }
  const address = [body.address?.barangay, body.address?.city, body.address?.province]
    .map(str)
    .filter(Boolean)
    .join(", ")
  put("Address", address)
  put("Property type", body.propertyType)
  put("Preferred solution", body.solutionInterest)
  put("Monthly bill (PHP)", body.monthlyBill)
  put("Monthly consumption (kWh)", body.monthlyKwh)
  put("Goals", body.goals)
  put("Daytime vs nighttime usage", body.usageProfile)
  put("Battery storage interest", body.batteryInterest)
  put("Urgency", body.urgency)
  put("Best time to contact", body.contactTime)
  put("Bill attachment", body.billAttachment)
  put("Electricity provider", body.utilityProvider)
  put("Heard about us", body.leadSource)
  put("Preferred contact", body.contactMethod)
  // Record the consent we just verified, so downstream (the inbox, the sales
  // email, the Google Sheets `Consent Status` column) reads a value that was
  // actually checked rather than one inferred from the channel.
  details["Consent"] = "Yes — consent box ticked on the website form"

  // Marketing attribution (L-04): only the whitelisted keys, each capped.
  if (body.attribution && typeof body.attribution === "object") {
    for (const key of ATTRIBUTION_KEYS) {
      const value = str(body.attribution[key]).slice(0, 300)
      if (value) details[key] = value
    }
  }

  const result = await forwardLead({
    name,
    email: str(body.email) || undefined,
    phone,
    message: str(body.siteNotes) || undefined,
    details,
    source: "website_form",
    // Verified above; the platform enforces it again at the write.
    consent: true,
  })
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
