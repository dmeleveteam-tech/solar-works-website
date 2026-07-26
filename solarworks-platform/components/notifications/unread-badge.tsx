import { badgeLabel } from "@/lib/notifications-shared"
import { cn } from "@/lib/utils"

/**
 * The red unread counter. Used on the header bell and on sidebar nav items, so
 * both read the same shape and cap ("99+"). Renders nothing at zero.
 *
 * `aria-hidden`: every caller already spells the count out in its own
 * accessible name, so announcing the bare number again would just be noise.
 */
export function UnreadBadge({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  if (count <= 0) return null

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold tabular-nums text-white dark:text-background",
        className,
      )}
    >
      {badgeLabel(count)}
    </span>
  )
}
