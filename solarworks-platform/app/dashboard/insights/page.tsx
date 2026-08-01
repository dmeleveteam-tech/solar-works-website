import { PageHeading } from "@/components/app-shell"
import { LeadInsights } from "@/components/dashboard/lead-insights"
import { getLeadStats } from "@/lib/lead-stats"
import { requireRole } from "@/lib/session"

export const metadata = { title: "Lead insights" }

const RANGES = [7, 30, 90]

/**
 * The range lives in the URL rather than component state so a staff member can
 * bookmark or paste "the last 90 days" view. Anything unrecognised falls back to
 * 30 instead of erroring — a hand-edited query string should not 500 the page.
 */
function parseRange(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return RANGES.includes(value) ? value : 30
}

export default async function LeadInsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRole("staff", "superadmin")

  const range = parseRange((await searchParams).range)
  const stats = await getLeadStats(range)

  return (
    <>
      <PageHeading
        title="Lead insights"
        description="Where enquiries come from, which channels close, and what is waiting on a reply."
      />
      <LeadInsights stats={stats} />
    </>
  )
}
