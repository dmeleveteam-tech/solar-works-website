import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/site-config"

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 rounded-md", className)}
      aria-label={`${siteConfig.name} — home`}
    >
      <Image
        src="/images/solar-works-logo.png"
        alt={siteConfig.name}
        width={160}
        height={160}
        className="h-20 w-20 object-contain [mix-blend-mode:multiply] dark:[mix-blend-mode:screen] lg:h-28 lg:w-28"
        priority
      />
    </Link>
  )
}

