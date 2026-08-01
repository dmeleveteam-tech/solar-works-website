import Link from "next/link"

import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Page not found" }

/**
 * Branded 404. It deliberately links home rather than back — a stale
 * bookmark or a deleted lead is the usual way anyone lands here, and "back"
 * would return them to the page that produced the dead link.
 */
export default function NotFound() {
  return (
    <main className="bg-solar-hero relative grain grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <Brand className="mb-10" />

        <p className="section-label">Error 404</p>
        <h1 className="text-display mt-3 text-[2rem] leading-[1.1]">
          We couldn&apos;t find that page
        </h1>
        <p className="mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed text-pretty text-muted-foreground">
          The link may be out of date, or the record it pointed at may have been
          removed. Everything else is where you left it.
        </p>

        {/* A single destination on purpose: `/` routes each role to its own
            home, so one link is correct for staff, editors and customers
            alike — a second link would be a dead end for at least one of
            them. */}
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/">Back to your dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
