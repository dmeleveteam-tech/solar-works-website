import Link from "next/link"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/site-config"

/**
 * Wordmark logo: the words "Solar Works" with a single small amber node dot as
 * the lone accent (no sun icon, per brand direction).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-baseline gap-1.5 rounded-md font-heading text-lg font-bold tracking-tight",
        className,
      )}
      aria-label={`${siteConfig.name} — home`}
    >
      <span>{siteConfig.name}</span>
      <span
        aria-hidden
        className="size-1.5 translate-y-[-0.1em] rounded-full bg-primary"
      />
    </Link>
  )
}
