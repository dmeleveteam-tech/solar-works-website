import "server-only"

import { leadsCollection, serializeLead } from "./leads"
import { LEAD_SOURCES, LEAD_STATUSES, type Lead, type LeadSource, type LeadStatus } from "./leads-shared"
import { hoursSince, isAwaitingResponse, scoreLead } from "./lead-intel"

/**
 * Aggregations behind the Lead insights page.
 *
 * The question this page exists to answer is "which of our four capture
 * channels is actually worth more effort" — the website form, the chatbot,
 * Messenger and the Google Form all cost different amounts to run, and until
 * now nothing in the platform compared what they return.
 *
 * Every figure is computed server-side and handed to the client as plain JSON,
 * so the charts stay a thin rendering layer with no database driver in the
 * bundle.
 */

export type SeriesPoint = {
  /** `YYYY-MM-DD`, the bucket's first day. */
  date: string
  /** Short human label for the axis, e.g. "12 Jul". */
  label: string
  captured: number
  won: number
}

export type SourceStat = {
  source: LeadSource
  captured: number
  won: number
  lost: number
  /** Won ÷ decided, as a percentage. Null when nothing has been decided yet. */
  winRate: number | null
  /** Mean lead score, 0–100 — is this channel bringing quality or just volume? */
  averageScore: number
}

export type FunnelStage = {
  status: LeadStatus
  count: number
}

export type LeadStats = {
  windowDays: number
  totals: {
    captured: number
    won: number
    open: number
    atRisk: number
  }
  /** Percentage change vs the immediately preceding window of equal length. */
  deltas: {
    captured: number | null
    won: number | null
    winRate: number | null
    responseHours: number | null
  }
  winRate: number | null
  /** Median hours from capture to the first status change away from "new". */
  medianResponseHours: number | null
  series: SeriesPoint[]
  sources: SourceStat[]
  funnel: FunnelStage[]
  /** Highest-scoring open leads, for the "work these next" panel. */
  priorityLeads: Lead[]
}

const DAY_MS = 86_400_000

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function isoDay(d: Date): string {
  return startOfDayUTC(d).toISOString().slice(0, 10)
}

const labelFormat = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/** Percentage change, guarding the divide-by-zero that a fresh install hits. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

/**
 * Time from capture to first touch. We don't store a dedicated
 * `firstContactedAt`, but a lead that has left "new" has had exactly one
 * meaningful edit in practice — the status change — so `updatedAt` stands in
 * for it. Leads still sitting at "new" are excluded rather than counted as
 * instant, which would flatter the number badly.
 */
function responseHours(lead: Lead): number | null {
  if (lead.status === "new") return null
  const captured = new Date(lead.createdAt).getTime()
  const touched = new Date(lead.updatedAt).getTime()
  if (Number.isNaN(captured) || Number.isNaN(touched) || touched < captured) {
    return null
  }
  return (touched - captured) / 3_600_000
}

/**
 * Bucket size adapts to the window so a 7-day view shows days and a 90-day view
 * shows weeks — 90 daily columns in a chart 600px wide is a barcode, not a
 * trend.
 */
function bucketDays(windowDays: number): number {
  if (windowDays <= 14) return 1
  if (windowDays <= 60) return 7
  return 14
}

function buildSeries(leads: Lead[], windowDays: number, from: Date): SeriesPoint[] {
  const step = bucketDays(windowDays)
  const bucketCount = Math.ceil(windowDays / step)
  const start = startOfDayUTC(from).getTime()

  const points: SeriesPoint[] = Array.from({ length: bucketCount }, (_, i) => {
    const at = new Date(start + i * step * DAY_MS)
    return { date: isoDay(at), label: labelFormat.format(at), captured: 0, won: 0 }
  })

  for (const lead of leads) {
    const at = new Date(lead.createdAt).getTime()
    const index = Math.floor((at - start) / (step * DAY_MS))
    const point = points[index]
    if (!point) continue
    point.captured += 1
    if (lead.status === "won") point.won += 1
  }

  return points
}

function buildSources(leads: Lead[]): SourceStat[] {
  return LEAD_SOURCES.map((source) => {
    const mine = leads.filter((l) => l.source === source)
    const won = mine.filter((l) => l.status === "won").length
    const lost = mine.filter((l) => l.status === "lost").length
    const decided = won + lost
    const totalScore = mine.reduce((sum, l) => sum + scoreLead(l).value, 0)

    return {
      source,
      captured: mine.length,
      won,
      lost,
      winRate: decided === 0 ? null : (won / decided) * 100,
      averageScore: mine.length === 0 ? 0 : Math.round(totalScore / mine.length),
    }
  })
    // Channels that have never produced a lead are noise on the chart, not a
    // finding — drop them rather than rendering five empty bars.
    .filter((s) => s.captured > 0)
    .sort((a, b) => b.captured - a.captured)
}

export async function getLeadStats(windowDays = 30): Promise<LeadStats> {
  const now = Date.now()
  const from = new Date(now - windowDays * DAY_MS)
  const priorFrom = new Date(now - windowDays * 2 * DAY_MS)

  // One read covers both the current window and the comparison window; the
  // split happens in memory, which is cheaper than two round trips at the
  // volumes this inbox sees.
  const docs = await leadsCollection()
    .find({ createdAt: { $gte: priorFrom } })
    .sort({ createdAt: -1 })
    .toArray()

  const all = docs.map(serializeLead)
  const current = all.filter((l) => new Date(l.createdAt) >= from)
  const previous = all.filter((l) => new Date(l.createdAt) < from)

  const won = current.filter((l) => l.status === "won").length
  const lost = current.filter((l) => l.status === "lost").length
  const decided = won + lost
  const winRate = decided === 0 ? null : (won / decided) * 100

  const prevWon = previous.filter((l) => l.status === "won").length
  const prevLost = previous.filter((l) => l.status === "lost").length
  const prevDecided = prevWon + prevLost
  const prevWinRate = prevDecided === 0 ? null : (prevWon / prevDecided) * 100

  const currentResponse = median(
    current.map(responseHours).filter((h): h is number => h != null)
  )
  const priorResponse = median(
    previous.map(responseHours).filter((h): h is number => h != null)
  )

  // The at-risk count is deliberately *not* windowed: a lead that has been
  // sitting unanswered for six weeks is the most urgent thing on the page and
  // must not fall out of view because the date filter moved.
  const openLeads = all.filter(
    (l) => l.status === "new" || l.status === "contacted" || l.status === "qualified"
  )

  const priorityLeads = openLeads
    .filter((l) => l.status !== "won")
    .sort((a, b) => {
      const risk = Number(isAwaitingResponse(b)) - Number(isAwaitingResponse(a))
      if (risk !== 0) return risk
      const score = scoreLead(b).value - scoreLead(a).value
      if (score !== 0) return score
      return hoursSince(b.createdAt) - hoursSince(a.createdAt)
    })
    .slice(0, 6)

  return {
    windowDays,
    totals: {
      captured: current.length,
      won,
      open: openLeads.length,
      atRisk: all.filter(isAwaitingResponse).length,
    },
    deltas: {
      captured: percentChange(current.length, previous.length),
      won: percentChange(won, prevWon),
      winRate:
        winRate == null || prevWinRate == null
          ? null
          : percentChange(winRate, prevWinRate),
      responseHours:
        currentResponse == null || priorResponse == null
          ? null
          : percentChange(currentResponse, priorResponse),
    },
    winRate,
    medianResponseHours: currentResponse,
    series: buildSeries(current, windowDays, from),
    sources: buildSources(current),
    funnel: LEAD_STATUSES.map((status) => ({
      status,
      count: current.filter((l) => l.status === status).length,
    })),
    priorityLeads,
  }
}
