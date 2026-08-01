import { cn } from "@/lib/utils"

/**
 * A shimmer placeholder. The sweep runs left-to-right rather than the stock
 * opacity pulse, which reads as "content is arriving" instead of "this element
 * is broken and blinking".
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/6 before:to-transparent",
        "motion-reduce:animate-pulse motion-reduce:before:hidden",
        className
      )}
      {...props}
    />
  )
}

/**
 * Row-shaped placeholder matching the `.data-row` rhythm, so a loading list
 * occupies exactly the space the real list will and nothing shifts on arrival.
 */
function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1 space-y-2">
            {/* Staggered widths so the block doesn't read as a striped pattern. */}
            <Skeleton
              className="h-3.5"
              style={{ width: `${38 + ((i * 13) % 26)}%` }}
            />
            <Skeleton
              className="h-3"
              style={{ width: `${22 + ((i * 17) % 20)}%` }}
            />
          </div>
          <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
          <Skeleton className="hidden h-8 w-20 shrink-0 rounded-md sm:block" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonRows }
