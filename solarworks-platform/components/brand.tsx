import { cn } from "@/lib/utils"

/** Solar Works wordmark — matches the marketing site's text logo treatment. */
export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading text-lg font-bold tracking-tight text-foreground",
        className,
      )}
    >
      Solar<span className="text-primary-strong">Works</span>
      <span className="ml-1 align-middle text-[0.65em] font-medium tracking-widest text-muted-foreground uppercase">
        Platform
      </span>
    </span>
  )
}
