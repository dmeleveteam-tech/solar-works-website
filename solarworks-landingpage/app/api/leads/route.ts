import { NextResponse } from "next/server"

/**
 * Same-origin proxy for the contact form. The browser posts the raw form shape
 * here; we map it to the platform's canonical lead shape and forward it
 * server-to-server with the shared ingest key. Keeping this on the server means
 * the platform URL and key never reach the browser, and there's no CORS hop.
 */

const PLATFORM_INGEST_URL = process.env.PLATFORM_INGEST_URL
const LEADS_INGEST_KEY = process.env.LEADS_INGEST_KEY

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
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

export async function POST(req: Request) {
  if (!PLATFORM_INGEST_URL || !LEADS_INGEST_KEY) {
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

  const payload = {
    name,
    email: str(body.email) || undefined,
    phone,
    message: str(body.siteNotes) || undefined,
    details,
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
      // Don't surface the platform's internals to the visitor.
      console.error("Lead forward failed:", res.status, await res.text().catch(() => ""))
      return NextResponse.json(
        { ok: false, error: "We couldn't submit your request. Please try again." },
        { status: 502 },
      )
    }
  } catch (err) {
    console.error("Lead forward error:", err)
    return NextResponse.json(
      { ok: false, error: "We couldn't reach our servers. Please try again." },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
