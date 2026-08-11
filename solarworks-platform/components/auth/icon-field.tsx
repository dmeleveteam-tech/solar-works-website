"use client"

import * as React from "react"
import { Eye, EyeOff, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Underline-only text input with a leading icon — the auth pages' input
 *  style (no box border, matches the split-panel login/signup design).
 *  When `type="password"`, a trailing show/hide toggle is added. */
export function IconField({
  icon: Icon,
  className,
  type,
  ...props
}: React.ComponentProps<"input"> & { icon: LucideIcon }) {
  const [visible, setVisible] = React.useState(false)
  const isPassword = type === "password"

  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        type={isPassword ? (visible ? "text" : "password") : type}
        className={cn(
          "w-full border-b border-input bg-transparent py-2 pl-6 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary-strong",
          isPassword && "pr-7",
          className,
        )}
      />
      {isPassword ? (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-0 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      ) : null}
    </div>
  )
}
