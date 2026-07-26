/**
 * Client-safe notification constants, types, and pure formatting helpers. Like
 * `leads-shared`, this module has NO `server-only` or mongodb import, so the
 * bell UI can import the enums and the serialized `AppNotification` shape
 * without pulling the database driver into the browser bundle. Server-only data
 * access lives in `./notifications`, which re-exports everything here.
 */

/** Every in-app event that can raise a notification. */
export const NOTIFICATION_TYPES = [
  "lead_new",
  "lead_assigned",
  "project_updated",
  "savings_updated",
  "content_published",
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/**
 * Icon keys are strings (not component references) so a notification stays
 * serializable across the Server → Client boundary — the same rule `NavItem`
 * follows. `NotificationList` maps each key to a lucide icon.
 */
export type NotificationIconName =
  | "lead"
  | "assigned"
  | "project"
  | "savings"
  | "content"

export const NOTIFICATION_ICON: Record<NotificationType, NotificationIconName> = {
  lead_new: "lead",
  lead_assigned: "assigned",
  project_updated: "project",
  savings_updated: "savings",
  content_published: "content",
}

/** Short channel label shown under each notification title. */
export const NOTIFICATION_LABEL: Record<NotificationType, string> = {
  lead_new: "New lead",
  lead_assigned: "Assigned to you",
  project_updated: "Project update",
  savings_updated: "Savings update",
  content_published: "Content",
}

/** Plain, client-safe shape (ObjectId / Date serialized to strings). */
export type AppNotification = {
  id: string
  type: NotificationType
  title: string
  body: string | null
  /** Where clicking the notification takes you, when there's somewhere to go. */
  href: string | null
  /** Whether *the requesting user* has read it. */
  read: boolean
  createdAt: string
}

export type NotificationFeed = {
  items: AppNotification[]
  unreadCount: number
}

export const EMPTY_FEED: NotificationFeed = { items: [], unreadCount: 0 }

/**
 * Highest number the red badge spells out; above this it reads "99+". The
 * server counts no further than this too, so a huge backlog stays cheap.
 */
export const BADGE_MAX = 99

export function badgeLabel(count: number): string {
  return count > BADGE_MAX ? `${BADGE_MAX}+` : String(count)
}

export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  )
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Compact "2m" / "3h" / "5d" age used in the dropdown. Falls back to a date once
 * a notification is older than a week. `now` is injectable so this stays pure
 * and testable.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""

  const elapsed = now.getTime() - then
  if (elapsed < MINUTE) return "just now"
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`

  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })
}
