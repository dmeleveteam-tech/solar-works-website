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
        alt=""
        width={72}
        height={72}
        className="h-14 w-14 object-contain [mix-blend-mode:multiply] dark:[mix-blend-mode:screen]"
        priority
      />
      <span className="font-heading text-lg font-bold leading-tight tracking-tight">
        Solar<br />
        <span className="text-primary">Works</span>
      </span>
    </Link>
  )
}

