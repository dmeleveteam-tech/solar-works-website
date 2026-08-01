import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The single badge used for every status, role, source and score pill in the
 * platform. Before this existed each manager hand-rolled its own
 * `rounded-full px-2 py-0.5` span with whatever raw tailwind colour felt right
 * (sky-700 here, violet-700 there, emerald-600 in a third place), so two pills
 * sitting in the same row disagreed on radius, weight and hue family.
 *
 * Tones resolve through the semantic ramp in `globals.css`, which is tuned to
 * the warm brand palette — so "won" reads as a considered green-in-an-amber-app
 * rather than a stock emerald.
 */
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-neutral-soft text-muted-foreground",
        brand: "bg-primary/15 text-primary-strong",
        success:
          "bg-success-soft text-success dark:bg-success-soft dark:text-success",
        warning:
          "bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning",
        info: "bg-info-soft text-info dark:bg-info-soft dark:text-info",
        danger: "bg-destructive/10 text-destructive",
        outline: "border border-border bg-transparent text-muted-foreground",
      },
      // Square-ish by default. The pill is reserved for counts, where the
      // capsule genuinely helps a 1-to-3-digit number keep its shape.
      shape: {
        default: "rounded-md",
        pill: "rounded-full",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[11px] leading-4 tracking-[0.01em]",
        default: "px-2 py-0.5 text-xs leading-5",
      },
    },
    defaultVariants: { tone: "neutral", shape: "default", size: "default" },
  }
)

function Badge({
  className,
  tone,
  shape,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone, shape, size, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
