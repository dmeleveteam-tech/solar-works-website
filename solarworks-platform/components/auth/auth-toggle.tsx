"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

/** Floating pill toggle between the login and signup routes, vertically
 *  stacked. A white indicator slides to whichever route is active; only
 *  meant for the desktop split panel — mobile falls back to the text link
 *  at the bottom of each form. */
export function AuthToggle() {
  const pathname = usePathname()
  const isSignup = pathname?.startsWith("/signup") ?? false

  return (
    <div className="relative flex h-36 w-28 flex-col rounded-full bg-white/20 p-1.5 shadow-lg ring-1 ring-white/50 backdrop-blur-sm">
      <span
        aria-hidden
        className="absolute inset-x-1.5 top-1.5 h-[calc(50%-6px)] rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          transform: isSignup ? "translateY(calc(100% + 3px))" : "translateY(0)",
        }}
      />
      <Link
        href="/login"
        className={cn(
          "relative z-10 grid flex-1 place-items-center rounded-full text-xs font-bold tracking-wide transition-colors",
          isSignup ? "text-white" : "text-neutral-900",
        )}
      >
        LOGIN
      </Link>
      <Link
        href="/signup"
        className={cn(
          "relative z-10 grid flex-1 place-items-center rounded-full text-xs font-bold tracking-wide transition-colors",
          isSignup ? "text-neutral-900" : "text-white",
        )}
      >
        SIGN UP
      </Link>
    </div>
  )
}
