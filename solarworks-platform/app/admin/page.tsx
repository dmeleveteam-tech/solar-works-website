import Link from "next/link"
import { headers } from "next/headers"
import {
  ArrowUpRight,
  FileText,
  FolderKanban,
  Inbox,
  LineChart,
  PiggyBank,
  Target,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { getLeadStats, type LeadStats } from "@/lib/lead-stats"
import { PageHeading } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Stat } from "@/components/ui/stat"

export const metadata = { title: "Admin" }

// Every card that is also a link needs the same lift + warmed border + focus
// ring; keeping it in one string is what stops the two panels below drifting.
const linkCard =
  "group relative grain block overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8 shadow-e1 transition-[box-shadow,transform,--tw-ring-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-e2 hover:ring-primary/35 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

export default async function AdminOverviewPage() {
  let totalUsers: number | null = null
  try {
    const res = await auth.api.listUsers({
      headers: await headers(),
      query: { limit: 1 },
    })
    totalUsers = res.total ?? null
  } catch {
    // DB not reachable yet (e.g. placeholder MONGODB_URI) — show a dash.
    totalUsers = null
  }

  let stats: LeadStats | null = null
  try {
    stats = await getLeadStats(30)
  } catch {
    // Same degradation as above: the KPI strip falls back to em-dashes rather
    // than taking the whole overview down with it.
    stats = null
  }

  const winRate = stats?.winRate

  return (
    <>
      <PageHeading
        title="Admin"
        description="Where the platform stands today, and where to pick work back up."
      />

      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Users"
          value={totalUsers ?? "—"}
          hint="Accounts with platform access"
          icon={Users}
        />
        <Stat
          label="Leads · 30 days"
          value={stats ? stats.totals.captured : "—"}
          delta={stats?.deltas.captured}
          deltaLabel="vs previous 30 days"
          icon={Inbox}
        />
        <Stat
          label="Awaiting reply"
          value={stats ? stats.totals.atRisk : "—"}
          hint={stats ? `${stats.totals.open} open in total` : undefined}
          icon={TriangleAlert}
        />
        <Stat
          label="Win rate"
          value={winRate == null ? "—" : `${winRate.toFixed(0)}%`}
          delta={stats?.deltas.winRate}
          deltaLabel="vs previous 30 days"
          icon={Target}
        />
      </section>

      {/* Asymmetric on purpose: the inbox is where the day actually starts, so
          it gets roughly two thirds and the rest stacks beside it. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Link
          href="/dashboard"
          className={`${linkCard} bg-solar-glow p-6 lg:col-span-2 lg:p-8`}
        >
          <span className="section-label">Jump back in</span>
          <h2 className="text-display mt-3 text-2xl">Leads inbox</h2>
          <p className="mt-2 max-w-[52ch] text-sm text-pretty text-muted-foreground">
            Website form, chatbot, Messenger and Google Form enquiries land in
            one queue. Reply, qualify, and mark them won or lost.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {stats && stats.totals.atRisk > 0 ? (
              <Badge tone="warning" shape="pill">
                <span className="tabular">{stats.totals.atRisk}</span> awaiting a
                reply
              </Badge>
            ) : null}
            {stats ? (
              <Badge tone="neutral" shape="pill">
                <span className="tabular">{stats.totals.open}</span> open
              </Badge>
            ) : null}
            <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary-strong">
              Open inbox
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </Link>

        <div className="grid gap-4 lg:content-start">
          <ShortcutCard
            href="/admin/users"
            icon={Users}
            title="Users"
            description="Create accounts, assign roles, ban access."
            meta={totalUsers == null ? undefined : `${totalUsers} total`}
          />
          <ShortcutCard
            href="/dashboard/insights"
            icon={LineChart}
            title="Lead insights"
            description="Which capture channel is worth the effort."
          />
          <ShortcutCard
            href="/cms"
            icon={FileText}
            title="Content"
            description="Testimonials, projects and FAQs on the marketing site."
          />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="section-label">Customer portal</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ShortcutCard
            href="/dashboard/projects"
            icon={FolderKanban}
            title="Projects"
            description="Installation stages and milestones customers can follow."
          />
          <ShortcutCard
            href="/dashboard/savings"
            icon={PiggyBank}
            title="Savings"
            description="Tariffs, plant links and generation uploads."
          />
        </div>
      </section>
    </>
  )
}

function ShortcutCard({
  href,
  icon: Icon,
  title,
  description,
  meta,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
  meta?: string
}) {
  return (
    <Link href={href} className={`${linkCard} p-5`}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-strong ring-1 ring-primary/15">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-heading text-sm font-semibold">{title}</p>
            {meta ? (
              <span className="tabular text-xs text-muted-foreground">
                {meta}
              </span>
            ) : null}
            <ArrowUpRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}
