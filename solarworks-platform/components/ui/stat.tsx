import * as React from "react"
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A KPI tile. Deliberately not a `Card`: a stat has no elevation story to tell,
 * so it's a flat well with a hairline. Stacking a shadowed card for every
 * number is what makes admin dashboards look like a pile of receipts.
 *
 * `delta` is the period-over-period change in percentage points; direction is
 * carried by an arrow and the semantic ramp, never by colour alone.
 */
export function Stat({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  icon: Icon,
  invertDelta = false,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  delta?: number | null
  deltaLabel?: string
  icon?: LucideIcon
  /** Set when a rise is bad news — e.g. average hours to first contact. */
  invertDelta?: boolean
  className?: string
}) {
  const flat = delta == null || Math.abs(delta) < 0.5
  const good = flat ? null : invertDelta ? delta! < 0 : delta! > 0
  const DeltaIcon = flat ? Minus : delta! > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div
      className={cn(
        "relative grain overflow-hidden rounded-xl bg-card p-4 ring-1 ring-foreground/8 transition-shadow duration-300 hover:shadow-e2",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="section-label">{label}</p>
        {Icon ? (
          <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground/70" />
        ) : null}
      </div>

      <p
        data-slot="stat-value"
        className="mt-3 font-heading text-3xl leading-none font-bold tracking-[-0.02em]"
      >
        {value}
      </p>

      {delta != null || hint ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {delta != null ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular",
                good === null && "text-muted-foreground",
                good === true && "text-success",
                good === false && "text-warning"
              )}
            >
              <DeltaIcon className="size-3" aria-hidden />
              {flat ? "No change" : `${Math.abs(delta).toFixed(0)}%`}
              <span className="sr-only">
                {flat ? "unchanged" : delta > 0 ? "increase" : "decrease"}
              </span>
            </span>
          ) : null}
          {deltaLabel ? (
            <span className="text-muted-foreground">{deltaLabel}</span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

/** Matching placeholder so a stat strip reserves its real height while loading. */
export function StatSkeleton() {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/8">
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-3.5 h-7 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-3 w-28 animate-pulse rounded bg-muted" />
    </div>
  )
}
