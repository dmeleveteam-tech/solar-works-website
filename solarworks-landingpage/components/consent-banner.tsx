"use client"

import Link from "next/link"

import { analyticsConfigured } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { useConsent, useHydrated } from "@/components/consent-provider"

/**
 * Cookie-consent banner. Appears once, only when analytics is configured and the
 * visitor hasn't chosen yet. Motion is a single gentle slide+fade and is
 * disabled under prefers-reduced-motion (per design standards).
 */
export function ConsentBanner() {
  const { consent, grant, deny } = useConsent()
  const hydrated = useHydrated()

  if (!analyticsConfigured) return null
  if (!hydrated || consent !== "unknown") return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className={[
        "fixed bottom-24 left-4 z-50 w-[min(24rem,calc(100vw-2rem))] lg:bottom-4",
        "rounded-2xl border bg-popover p-4 text-popover-foreground shadow-2xl",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3",
      ].join(" ")}
    >
      <p className="text-sm text-pretty">
        We use analytics cookies to understand how visitors use our site and improve it.
        See our{" "}
        <Link
          href="/privacy"
          className="font-medium text-primary-strong underline-offset-2 hover:underline"
        >
          Privacy Notice
        </Link>
        .
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={grant} className="flex-1">
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={deny} className="flex-1">
          Decline
        </Button>
      </div>
    </div>
  )
}
