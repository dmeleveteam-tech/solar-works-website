"use client"

import { usePathname } from "next/navigation"

import type { NavItem } from "@/components/app-shell"
import { activeNavItem } from "@/lib/active-nav"

/** Shows the current section's label in the inset header. */
export function ActiveCrumb({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname()
  const active = activeNavItem(pathname, nav)
  return (
    <span className="text-sm font-medium">{active?.label ?? "Solar Works"}</span>
  )
}
