import Image from "next/image"
import { cn } from "@/lib/utils"

type PhotoProps = {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  sizes?: string
  priority?: boolean
}

/**
 * Image slot with a warm gradient backdrop. The gradient keeps the slot looking
 * intentional during load (and if a remote image is unavailable). Uses
 * next/image for lazy-loading + optimization per G-07 / NFR-01.
 */
export function Photo({
  src,
  alt,
  className,
  imgClassName,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
}: PhotoProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-primary/15 via-muted to-secondary",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", imgClassName)}
      />
    </div>
  )
}
