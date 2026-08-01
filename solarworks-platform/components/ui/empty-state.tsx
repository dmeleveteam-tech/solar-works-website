import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The composed "nothing here yet" view. Every list in the platform used to fall
 * back to a bare centred sentence in muted grey, which reads as a rendering
 * failure rather than a state. This gives the empty case a shape: an icon in a
 * tinted well, a plain-language explanation of what will fill it, and the
 * action that fills it.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative grain flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary-strong ring-1 ring-primary/15">
        <Icon className="size-5" />
      </span>
      <p className="font-heading text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-[46ch] text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
