import Image from "next/image"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

type PhotoProps = {
  /** Image URL. When empty/omitted, a "to be provided" placeholder is shown. */
  src?: string
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
 *
 * When no `src` is provided, we render an explicit placeholder instead of a
 * stock photo, so the team can drop in a real Solar Works image later without
 * the site implying a photo it doesn't have.
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
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imgClassName)}
        />
      ) : (
        <div
          role="img"
          aria-label="Solar Works image to be provided"
          className="absolute inset-0 grid place-items-center p-4 text-center"
        >
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
            <span className="text-xs font-semibold tracking-wide uppercase">
              SOLARWORK IMAGE TO BE PROVIDED
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
