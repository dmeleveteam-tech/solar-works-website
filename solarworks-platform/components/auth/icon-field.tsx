import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Underline-only text input with a leading icon — the auth pages' input
 *  style (no box border, matches the split-panel login design). */
export function IconField({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<"input"> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        className={cn(
          "w-full border-b border-input bg-transparent py-2 pl-6 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary-strong",
          className,
        )}
      />
    </div>
  )
}
