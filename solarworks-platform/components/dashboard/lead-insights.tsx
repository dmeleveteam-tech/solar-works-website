"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChartColumn,
  Clock,
  Funnel,
  Inbox,
  Target,
  TrendingUp,
  TriangleAlert,
  Trophy,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Stat } from "@/components/ui/stat"
import { BAND_LABEL, scoreLead, shortAge } from "@/lib/lead-intel"
import type { LeadStats } from "@/lib/lead-stats"
import { SOURCE_LABEL, STATUS_LABEL, type LeadStatus } from "@/lib/leads-shared"
import { cn } from "@/lib/utils"

const RANGES = [7, 30, 90]

/**
 * Chart ink comes from the amber ramp in `globals.css`. Recharts reads the
 * custom properties straight off the SVG, so the same markup re-paints on a
 * theme switch without a re-render.
 */
const INK = {
  captured: "var(--chart-3)",
  capturedFill: "var(--chart-1)",
  won: "var(--chart-5)",
  wonFill: "var(--chart-3)",
  bar: "var(--chart-2)",
  barWon: "var(--chart-4)",
} as const

const GRID = { stroke: "var(--foreground)", strokeOpacity: 0.08 }
const TICK = { fill: "var(--muted-foreground)", fontSize: 11 }

const integer = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 })

/** "45m" / "3.2h" / "1.4d" — an adviser thinks in whichever unit is smallest. */
function formatHours(hours: number | null): string {
  if (hours == null) return "—"
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  if (hours < 48) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

function formatPercent(value: number | null, digits = 0): string {
  return value == null ? "—" : `${value.toFixed(digits)}%`
}

// --- shared chrome -----------------------------------------------------------

type TipPayload = TooltipContentProps<number, string>["payload"]

function ChartTooltip({
  active,
  label,
  payload,
  suffix,
}: {
  active?: boolean
  label?: string | number
  payload?: TipPayload
  suffix?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-e3 ring-1 ring-foreground/10">
      {label != null ? (
        <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey ?? entry.name)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular text-popover-foreground">
              {integer.format(Number(entry.value ?? 0))}
              {suffix}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

function RangeSwitcher({ current }: { current: number }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex items-center gap-0.5 rounded-lg bg-neutral-soft p-0.5"
    >
      {RANGES.map((days) => {
        const active = days === current
        return (
          <button
            key={days}
            type="button"
            aria-pressed={active}
            onClick={() => router.push(`${pathname}?range=${days}`)}
            className={cn(
              "rounded-[7px] px-2.5 py-1 text-xs font-medium tabular transition-colors",
              active
                ? "bg-card text-foreground shadow-e1"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {days}d
          </button>
        )
      })}
    </div>
  )
}

// --- panels ------------------------------------------------------------------

function CaptureTrend({ stats }: { stats: LeadStats }) {
  const hasData = stats.series.some((p) => p.captured > 0 || p.won > 0)

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Capture trend</CardTitle>
        <CardDescription>
          Enquiries received and deals won over the last {stats.windowDays} days.
        </CardDescription>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <LegendDot color={INK.captured} label="Captured" />
          <LegendDot color={INK.won} label="Won" />
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.series}
                margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
              >
                <defs>
                  <linearGradient id="insights-captured" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={INK.capturedFill} stopOpacity={0.75} />
                    <stop offset="100%" stopColor={INK.capturedFill} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="insights-won" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={INK.wonFill} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={INK.wonFill} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={TICK}
                  minTickGap={16}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={TICK}
                  allowDecimals={false}
                  width={44}
                />
                <Tooltip
                  cursor={{ stroke: "var(--foreground)", strokeOpacity: 0.15 }}
                  content={(props) => (
                    <ChartTooltip
                      active={props.active}
                      label={props.label}
                      payload={props.payload}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="captured"
                  name="Captured"
                  stroke={INK.captured}
                  strokeWidth={2}
                  fill="url(#insights-captured)"
                />
                <Area
                  type="monotone"
                  dataKey="won"
                  name="Won"
                  stroke={INK.won}
                  strokeWidth={2}
                  fill="url(#insights-won)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No enquiries in this range"
            description="Once the website form, chatbot or Messenger captures a lead, the trend appears here."
          />
        )}
      </CardContent>
    </Card>
  )
}

function ChannelPerformance({ stats }: { stats: LeadStats }) {
  const { sources } = stats

  // The headline the page exists for: the channel that brings the most enquiries
  // is often not the one that closes them, and that gap is where the budget
  // decision lives.
  const topVolume = sources[0] ?? null
  const decided = sources.filter((s) => s.winRate != null)
  const bestRate = decided.reduce<(typeof decided)[number] | null>(
    (best, s) => (best == null || s.winRate! > best.winRate! ? s : best),
    null
  )
  const takeaway =
    topVolume && bestRate && bestRate.source !== topVolume.source
      ? `${SOURCE_LABEL[bestRate.source]} closes ${formatPercent(bestRate.winRate)} of decided leads against ${SOURCE_LABEL[topVolume.source]}'s ${formatPercent(topVolume.winRate)}, on ${integer.format(bestRate.captured)} enquiries versus ${integer.format(topVolume.captured)}.`
      : null

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Channel performance</CardTitle>
        <CardDescription>
          Volume by capture channel, with the conversion each one actually
          returns.
        </CardDescription>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <LegendDot color={INK.bar} label="Captured" />
          <LegendDot color={INK.barWon} label="Won" />
        </div>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <EmptyState
            icon={ChartColumn}
            title="No channel data yet"
            description="Every lead records the channel it arrived through. This chart fills in with the first enquiry."
          />
        ) : (
          <>
            <div
              className="w-full"
              style={{ height: Math.max(160, sources.length * 56) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sources}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
                  barGap={2}
                >
                  <CartesianGrid {...GRID} horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={TICK}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="source"
                    tickLine={false}
                    axisLine={false}
                    tick={TICK}
                    width={104}
                    tickFormatter={(value: string) =>
                      SOURCE_LABEL[value as keyof typeof SOURCE_LABEL] ?? value
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
                    content={(props) => (
                      <ChartTooltip
                        active={props.active}
                        label={
                          SOURCE_LABEL[
                            props.label as keyof typeof SOURCE_LABEL
                          ] ?? props.label
                        }
                        payload={props.payload}
                      />
                    )}
                  />
                  <Bar
                    dataKey="captured"
                    name="Captured"
                    fill={INK.bar}
                    radius={[0, 4, 4, 0]}
                    barSize={12}
                  />
                  <Bar
                    dataKey="won"
                    name="Won"
                    fill={INK.barWon}
                    radius={[0, 4, 4, 0]}
                    barSize={12}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {takeaway ? (
              <p className="mt-4 rounded-lg bg-info-soft px-3 py-2 text-xs text-info">
                {takeaway}
              </p>
            ) : null}

            <div className="mt-4 -mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[26rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Channel</th>
                    <th className="py-2 pr-3 text-right font-medium">Captured</th>
                    <th className="py-2 pr-3 text-right font-medium">Won</th>
                    <th className="py-2 pr-3 text-right font-medium">Lost</th>
                    <th className="py-2 pr-3 text-right font-medium">Win rate</th>
                    <th className="py-2 text-right font-medium">Avg score</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.source} className="border-b border-border/40 last:border-0">
                      <td className="py-2 pr-3">{SOURCE_LABEL[s.source]}</td>
                      <td className="py-2 pr-3 text-right tabular">
                        {integer.format(s.captured)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular">
                        {integer.format(s.won)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular text-muted-foreground">
                        {integer.format(s.lost)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular font-medium">
                        {formatPercent(s.winRate)}
                      </td>
                      <td className="py-2 text-right tabular text-muted-foreground">
                        {s.averageScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

const STAGE_INK: Record<LeadStatus, string> = {
  new: "var(--chart-2)",
  contacted: "var(--chart-3)",
  qualified: "var(--chart-4)",
  won: "var(--chart-5)",
  lost: "var(--muted-foreground)",
}

const PROGRESSION: LeadStatus[] = ["new", "contacted", "qualified", "won"]

function PipelineFunnel({ stats }: { stats: LeadStats }) {
  const count = React.useMemo(() => {
    const map = {} as Record<LeadStatus, number>
    for (const stage of stats.funnel) map[stage.status] = stage.count
    return map
  }, [stats.funnel])

  const total = stats.funnel.reduce((sum, s) => sum + s.count, 0)

  /**
   * `funnel` holds *current* statuses, not a cumulative journey, so the raw
   * counts cannot be stacked — a won lead is no longer sitting in "contacted".
   * Reach is reconstructed instead: everyone entered as new, everyone past new
   * was contacted, and so on. Lost leads are counted as having been contacted
   * (we only learn a lead is lost by talking to them) but are reported on their
   * own line rather than as a funnel stage.
   */
  const reach: Record<LeadStatus, number> = {
    new: total,
    contacted: total - (count.new ?? 0),
    qualified: (count.qualified ?? 0) + (count.won ?? 0),
    won: count.won ?? 0,
    lost: count.lost ?? 0,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline funnel</CardTitle>
        <CardDescription>
          How far the {integer.format(total)} enquiries in this range progressed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState
            icon={Funnel}
            title="Nothing in the pipeline"
            description="Stages fill in as advisers move leads from new through to won."
          />
        ) : (
          <ul className="space-y-3">
            {PROGRESSION.map((status, i) => {
              const value = reach[status]
              const previous = i === 0 ? null : reach[PROGRESSION[i - 1]]
              const dropOff =
                previous == null || previous === 0
                  ? null
                  : ((previous - value) / previous) * 100

              return (
                <li key={status}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-medium">{STATUS_LABEL[status]}</span>
                    <span className="tabular text-muted-foreground">
                      {integer.format(value)}
                      {total > 0 ? ` · ${formatPercent((value / total) * 100)}` : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-soft">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: total > 0 ? `${(value / total) * 100}%` : "0%",
                        backgroundColor: STAGE_INK[status],
                      }}
                    />
                  </div>
                  {dropOff != null && dropOff > 0 ? (
                    <p className="mt-1 text-[11px] text-muted-foreground tabular">
                      {formatPercent(dropOff)} drop-off from{" "}
                      {STATUS_LABEL[PROGRESSION[i - 1]].toLowerCase()}
                    </p>
                  ) : null}
                </li>
              )
            })}

            <li className="border-t border-border/60 pt-3">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Marked lost</span>
                <span className="tabular text-muted-foreground">
                  {integer.format(reach.lost)}
                </span>
              </div>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function PriorityPanel({ stats }: { stats: LeadStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Work these next</CardTitle>
        <CardDescription>
          Highest-scoring open leads, oldest waiting first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stats.priorityLeads.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nothing waiting"
            description="Every open lead has been picked up. New enquiries land here as they arrive."
          />
        ) : (
          <ul className="divide-y divide-border/50">
            {stats.priorityLeads.map((lead) => {
              const score = scoreLead(lead)
              const tone =
                score.band === "hot"
                  ? "warning"
                  : score.band === "warm"
                    ? "info"
                    : "neutral"

              return (
                <li key={lead.id}>
                  <Link
                    href="/dashboard"
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {lead.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {SOURCE_LABEL[lead.source]} · {STATUS_LABEL[lead.status]}
                      </span>
                    </span>
                    <Badge tone={tone} size="sm">
                      {BAND_LABEL[score.band]} {score.value}
                    </Badge>
                    <span className="w-9 shrink-0 text-right text-xs tabular text-muted-foreground">
                      {shortAge(lead.createdAt)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// --- page --------------------------------------------------------------------

export function LeadInsights({ stats }: { stats: LeadStats }) {
  const atRisk = stats.totals.atRisk

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="section-label">Last {stats.windowDays} days</p>
        <RangeSwitcher current={stats.windowDays} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Leads captured"
          value={integer.format(stats.totals.captured)}
          icon={Inbox}
          delta={stats.deltas.captured}
          deltaLabel="vs previous period"
        />
        <Stat
          label="Win rate"
          value={formatPercent(stats.winRate)}
          icon={Trophy}
          delta={stats.deltas.winRate}
          hint={`${integer.format(stats.totals.won)} won`}
        />
        <Stat
          label="Median response"
          value={formatHours(stats.medianResponseHours)}
          icon={Clock}
          delta={stats.deltas.responseHours}
          invertDelta
          hint="capture to first touch"
        />
        <Link
          href="/dashboard"
          className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Stat
            label="Needs a reply"
            value={
              <span className={cn(atRisk > 0 && "text-warning")}>
                {integer.format(atRisk)}
              </span>
            }
            icon={atRisk > 0 ? TriangleAlert : Target}
            hint={
              atRisk > 0 ? "past the 4-hour target" : "all open leads answered"
            }
            className={cn(
              "h-full",
              atRisk > 0 && "ring-warning/40 bg-warning-soft/40"
            )}
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CaptureTrend stats={stats} />
        <PriorityPanel stats={stats} />
        <ChannelPerformance stats={stats} />
        <PipelineFunnel stats={stats} />
      </div>
    </div>
  )
}
