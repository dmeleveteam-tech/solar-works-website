import Image from "next/image"

import { cn } from "@/lib/utils"

/** Circular Solar Works badge on its own — used where space is tight (e.g. the
 *  collapsed sidebar rail). The asset is already background-free, so it needs
 *  no blend-mode tricks in either theme. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/solar-works-logo.png"
      alt=""
      width={64}
      height={64}
      className={cn("size-8 shrink-0 object-contain", className)}
      priority
    />
  )
}

/** Solar Works lockup — badge plus wordmark, matching the marketing site. */
export function Brand({
  className,
  showMark = true,
}: {
  className?: string
  showMark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showMark ? <BrandMark /> : null}
      <span className="font-heading text-lg font-bold tracking-tight text-foreground">
        Solar<span className="text-primary-strong">Works</span>
        <span className="ml-1 align-middle text-[0.65em] font-medium tracking-widest text-muted-foreground uppercase">
          Platform
        </span>
      </span>
    </span>
  )
}
