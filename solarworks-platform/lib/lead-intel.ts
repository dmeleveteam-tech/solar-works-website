/**
 * Lead intelligence — scoring, ageing and contact routing.
 *
 * Everything here is *derived* at read time from fields the website form, the
 * chatbot and the Google Form already capture into `lead.details`. Nothing is
 * persisted, so there is no schema migration, no backfill, and no second copy
 * of the truth to keep in sync: change a weight below and every historical lead
 * re-scores on the next render.
 *
 * Deliberately free of `server-only` and any mongodb import — the inbox is a
 * Client Component and needs to sort and filter by these values without a
 * round trip.
 */

import type { Lead, LeadStatus } from "./leads-shared"

// --- scoring ----------------------------------------------------------------

export const SCORE_BANDS = ["hot", "warm", "cold"] as const
export type ScoreBand = (typeof SCORE_BANDS)[number]

export const BAND_LABEL: Record<ScoreBand, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
}

/**
 * Detail labels are written by the capture endpoints as human strings ("Monthly
 * bill (PHP)"). Match them loosely — lowercased substring — so a copy tweak on
 * the marketing form doesn't silently zero out a scoring signal.
 */
function detail(lead: Lead, needle: string): string {
  const entries = Object.entries(lead.details ?? {})
  const hit = entries.find(([label]) =>
    label.toLowerCase().includes(needle.toLowerCase())
  )
  return hit?.[1]?.toLowerCase() ?? ""
}

/**
 * Monthly bill is the strongest predictor of system size, and therefore of
 * deal value — a ₱25k/month commercial roof is worth an adviser's morning in a
 * way a ₱2k/month apartment is not. Bands mirror the marketing form's options;
 * free-typed peso amounts from the chatbot are parsed as a fallback.
 */
function billPoints(lead: Lead): number {
  const raw = detail(lead, "monthly bill")
  if (!raw) return 0
  if (raw.includes("above") || raw.includes("20,000")) return 40
  if (raw.includes("10,000")) return 32
  if (raw.includes("5,000")) return 22
  if (raw.includes("3,000")) return 12
  if (raw.includes("below")) return 4
  if (raw.includes("not sure")) return 8

  // Chatbot transcripts can carry a bare number. Take the largest figure in the
  // string so "₱10,000 – ₱20,000" typed by hand lands in the right band.
  const numbers = raw.match(/[\d,]+/g)?.map((n) => Number(n.replace(/,/g, "")))
  const top = numbers?.length ? Math.max(...numbers) : 0
  if (top >= 20000) return 40
  if (top >= 10000) return 32
  if (top >= 5000) return 22
  if (top >= 3000) return 12
  return top > 0 ? 4 : 0
}

/** Commercial and agricultural sites carry bigger arrays and faster payback. */
function propertyPoints(lead: Lead): number {
  const raw = detail(lead, "property type")
  if (!raw) return 0
  if (raw.includes("commercial") || raw.includes("resort")) return 18
  if (raw.includes("farm") || raw.includes("school") || raw.includes("office"))
    return 14
  if (raw.includes("home")) return 8
  return 4
}

/** A stated timeline is the difference between a buyer and a browser. */
function urgencyPoints(lead: Lead): number {
  const raw = detail(lead, "urgency")
  if (!raw) return 0
  if (raw.includes("asap") || raw.includes("immediat") || raw.includes("1 month"))
    return 20
  if (raw.includes("3 month") || raw.includes("quarter")) return 14
  if (raw.includes("6 month")) return 8
  if (raw.includes("year") || raw.includes("just")) return 2
  return 6
}

/**
 * Reachability. A lead we cannot phone is a lead we will probably lose, so
 * having a number at all is worth more than any single questionnaire answer.
 */
function contactabilityPoints(lead: Lead): number {
  let points = 0
  if (lead.phone) points += 12
  if (lead.email) points += 6
  if (detail(lead, "best time to contact")) points += 3
  return points
}

/** Signals that the enquiry was considered rather than idly submitted. */
function intentPoints(lead: Lead): number {
  let points = 0
  if (detail(lead, "bill attachment")) points += 8
  const solution = detail(lead, "preferred solution")
  if (solution && !solution.includes("not sure")) points += 5
  if (detail(lead, "battery")) points += 3
  if ((lead.message ?? "").trim().length > 60) points += 4
  return points
}

export type LeadScore = {
  /** 0–100. */
  value: number
  band: ScoreBand
  /** Human-readable drivers, best first — shown as "why" in the inbox. */
  reasons: string[]
}

export function scoreLead(lead: Lead): LeadScore {
  const parts: Array<[number, string]> = [
    [billPoints(lead), "High monthly bill"],
    [propertyPoints(lead), "Commercial or large site"],
    [urgencyPoints(lead), "Near-term timeline"],
    [contactabilityPoints(lead), "Phone number on file"],
    [intentPoints(lead), "Detailed enquiry"],
  ]

  const raw = parts.reduce((sum, [points]) => sum + points, 0)
  const value = Math.min(100, Math.round(raw))
  const reasons = parts
    .filter(([points]) => points >= 8)
    .sort((a, b) => b[0] - a[0])
    .map(([, label]) => label)

  const band: ScoreBand = value >= 60 ? "hot" : value >= 32 ? "warm" : "cold"
  return { value, band, reasons }
}

// --- ageing / speed-to-lead --------------------------------------------------

/**
 * Hours a new enquiry may sit untouched before it is treated as at risk.
 * Conversion on inbound solar enquiries falls off a cliff after the first few
 * hours — this is the number the at-risk queue is built around.
 */
export const RESPONSE_TARGET_HOURS = 4
/** Past this, the lead is functionally cold no matter how good it looked. */
export const RESPONSE_BREACH_HOURS = 24

export type Urgency = "fresh" | "due" | "overdue"

export function hoursSince(iso: string): number {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 0
  return Math.max(0, (Date.now() - then) / 3_600_000)
}

/**
 * Only leads still sitting at "new" can be overdue — once someone has moved it
 * to contacted or beyond, the clock has served its purpose and a red badge
 * would just be noise.
 */
export function responseUrgency(lead: Lead): Urgency {
  if (lead.status !== "new") return "fresh"
  const hours = hoursSince(lead.createdAt)
  if (hours >= RESPONSE_BREACH_HOURS) return "overdue"
  if (hours >= RESPONSE_TARGET_HOURS) return "due"
  return "fresh"
}

export function isAwaitingResponse(lead: Lead): boolean {
  return responseUrgency(lead) !== "fresh"
}

/** Compact age for a table cell: "40m", "6h", "3d". */
export function shortAge(iso: string): string {
  const hours = hoursSince(iso)
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  if (hours < 48) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

/** Sort helper: most urgent first, then hottest, then newest. */
export function byPriority(a: Lead, b: Lead): number {
  const rank = { overdue: 0, due: 1, fresh: 2 } as const
  const urgency = rank[responseUrgency(a)] - rank[responseUrgency(b)]
  if (urgency !== 0) return urgency
  const score = scoreLead(b).value - scoreLead(a).value
  if (score !== 0) return score
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

// --- one-click contact -------------------------------------------------------

/**
 * Philippine mobile numbers arrive as "0917 000 0000", "+63 917 000 0000" or
 * "63917...". Normalise to E.164 so `tel:` and the Viber/WhatsApp deep links
 * all dial the same number regardless of how the lead typed it.
 */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/[^\d+]/g, "")
  if (digits.startsWith("+")) return digits
  if (digits.startsWith("63")) return `+${digits}`
  if (digits.startsWith("0")) return `+63${digits.slice(1)}`
  if (digits.length >= 10) return `+63${digits}`
  return null
}

function firstName(lead: Lead): string {
  return lead.name.trim().split(/\s+/)[0] || "there"
}

/**
 * The opener an adviser would otherwise retype thirty times a day. It names the
 * lead's own stated interest back to them, which is the whole reason we ask for
 * it on the form.
 */
export function followUpMessage(lead: Lead): string {
  const interest = detail(lead, "preferred solution")
  const property = detail(lead, "property type")
  const subject =
    interest && !interest.includes("not sure")
      ? `your ${interest} enquiry`
      : property
        ? `solar for your ${property}`
        : "your solar enquiry"

  return [
    `Hi ${firstName(lead)},`,
    "",
    `Thanks for getting in touch with Solar Works about ${subject}. I'd like to walk you through what a system for your site would look like and what it would save you each month.`,
    "",
    "Is there a good time this week for a short call?",
    "",
    "— Solar Works",
  ].join("\n")
}

export type ContactAction = {
  key: "call" | "email" | "viber" | "whatsapp" | "messenger"
  label: string
  href: string
  /** True when the target opens outside the app and needs the usual rel guard. */
  external: boolean
}

/**
 * Every way we can reach this lead right now, ordered by how likely it is to
 * get an answer. Channels the lead didn't give us are simply absent — a
 * disabled "Call" button on a lead with no phone number is just clutter.
 */
export function contactActions(lead: Lead): ContactAction[] {
  const actions: ContactAction[] = []
  const phone = normalizePhone(lead.phone)
  const body = followUpMessage(lead)

  if (phone) {
    actions.push({ key: "call", label: "Call", href: `tel:${phone}`, external: false })
  }

  if (lead.email) {
    const subject = encodeURIComponent(
      lead.refId ? `Solar Works — your enquiry (${lead.refId})` : "Solar Works — your enquiry"
    )
    actions.push({
      key: "email",
      label: "Email",
      href: `mailto:${lead.email}?subject=${subject}&body=${encodeURIComponent(body)}`,
      external: false,
    })
  }

  if (phone) {
    // Viber and WhatsApp both want the number without the leading "+".
    const bare = phone.replace(/^\+/, "")
    actions.push({
      key: "viber",
      label: "Viber",
      href: `viber://chat?number=${encodeURIComponent(phone)}`,
      external: true,
    })
    actions.push({
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/${bare}?text=${encodeURIComponent(body)}`,
      external: true,
    })
  }

  // Messenger leads are answered in the thread they arrived in; we hold a PSID,
  // not a profile URL, so this opens the Page inbox rather than the person.
  if (lead.source === "messenger") {
    actions.push({
      key: "messenger",
      label: "Messenger",
      href: "https://business.facebook.com/latest/inbox/all",
      external: true,
    })
  }

  return actions
}

// --- status helpers ----------------------------------------------------------

/** Statuses that still represent an open opportunity. */
export const OPEN_STATUSES: readonly LeadStatus[] = ["new", "contacted", "qualified"]

export function isOpen(lead: Lead): boolean {
  return OPEN_STATUSES.includes(lead.status)
}
