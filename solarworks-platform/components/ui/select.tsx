import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A native `<select>` styled to match `Input`. Three managers had each pasted
 * their own near-identical `controlClass` string, which is why the leads inbox
 * and the projects editor drifted to different heights and focus rings. The
 * element stays native — the OS picker is better on touch than anything we'd
 * build, and it keeps the form-reset / FormData behaviour these forms rely on.
 */
function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative inline-grid w-full">
      <select
        data-slot="select"
        className={cn(
          "col-start-1 row-start-1 h-9 w-full appearance-none rounded-md border border-input bg-transparent py-1 pr-8 pl-2.5 text-sm shadow-e1 transition-[color,box-shadow,border-color] outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "hover:border-ring/60 disabled:pointer-events-none disabled:opacity-50",
          "dark:bg-input/30",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none col-start-1 row-start-1 size-4 self-center justify-self-end mr-2.5 text-muted-foreground"
      />
    </div>
  )
}

export { Select }
