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
  utilityProvider?: string
  leadSource?: string
  siteNotes?: string
  contactMethod?: string
  turnstileToken?: string
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

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
  put("Electricity provider", body.utilityProvider)
  put("Heard about us", body.leadSource)
  put("Preferred contact", body.contactMethod)

  const result = await forwardLead({
    name,
    email: str(body.email) || undefined,
    phone,
    message: str(body.siteNotes) || undefined,
    details,
    source: "website_form",
  })
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
