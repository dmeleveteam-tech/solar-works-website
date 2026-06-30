import Link from "next/link"
import { Phone } from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { Button } from "@/components/ui/button"

/**
 * Sticky mobile action bar (G-02 / G-03). Always-available primary CTA + call.
 * Hidden on lg+ where the header CTA is persistent.
 */
export function MobileCtaBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 p-3 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <Button asChild variant="outline" size="lg" className="shrink-0">
          <a href={siteConfig.contact.phone.href} aria-label="Call us">
            <Phone />
          </a>
        </Button>
        <Button asChild size="lg" className="flex-1">
          <Link href={siteConfig.primaryCta.href}>Get Free Assessment</Link>
        </Button>
      </div>
    </div>
  )
}
