"use client"

import * as React from "react"
import Link from "next/link"
import {
  Bell,
  CheckCheck,
  FileText,
  FolderKanban,
  Inbox,
  PiggyBank,
  UserCheck,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  NOTIFICATION_ICON,
  NOTIFICATION_LABEL,
  relativeTime,
  type AppNotification,
  type NotificationIconName,
} from "@/lib/notifications-shared"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useNotifications } from "@/components/notifications/notifications-provider"
import { UnreadBadge } from "@/components/notifications/unread-badge"

/**
 * The header bell: a red unread counter and a dropdown of recent notifications.
 * Feed state lives in `NotificationsProvider`, which the sidebar shares.
 */

const NOTIFICATION_ICONS: Record<NotificationIconName, LucideIcon> = {
  lead: Inbox,
  assigned: UserCheck,
  project: FolderKanban,
  savings: PiggyBank,
  content: FileText,
}

export function NotificationBell() {
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell />
          {/* Ringed so the badge stays legible over the icon it overlaps. */}
          <UnreadBadge
            count={unreadCount}
            className="absolute -top-1 -right-1 ring-2 ring-background"
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-88 p-0 shadow-e3">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
          <p className="section-label">
            Notifications
            {unreadCount > 0 ? (
              <span className="ml-1.5 text-primary-strong tabular">
                {unreadCount}
              </span>
            ) : null}
          </p>
          <Button
            variant="ghost"
            size="xs"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck />
            Mark all read
          </Button>
        </div>

        {loading && items.length === 0 ? (
          // Match the real row height so the panel doesn't resize under the
          // cursor the moment the feed lands.
          <div className="space-y-1 p-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-2.5 p-2">
                <Skeleton className="size-7 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto mb-3 grid size-9 place-items-center rounded-lg bg-success-soft text-success">
              <CheckCheck className="size-4" />
            </span>
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New leads and project updates will show up here.
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto p-1">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                notification={item}
                onSelect={() => {
                  markRead(item.id)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

const ROW_CLASS =
  "flex w-full items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"

function NotificationRow({
  notification,
  onSelect,
}: {
  notification: AppNotification
  onSelect: () => void
}) {
  const Icon = NOTIFICATION_ICONS[NOTIFICATION_ICON[notification.type]]
  const unread = !notification.read

  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
          unread
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 text-sm leading-snug",
              unread ? "font-medium" : "text-muted-foreground",
            )}
          >
            {notification.title}
          </span>
          {unread ? (
            <>
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive"
              />
              <span className="sr-only">Unread</span>
            </>
          ) : null}
        </span>

        {notification.body ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {notification.body}
          </span>
        ) : null}

        <span className="mt-1 block text-[11px] text-muted-foreground">
          {NOTIFICATION_LABEL[notification.type]} ·{" "}
          {relativeTime(notification.createdAt)}
        </span>
      </span>
    </>
  )

  // Most notifications point somewhere; the ones that don't are still
  // clickable so they can be dismissed from the unread count.
  return notification.href ? (
    <Link href={notification.href} className={ROW_CLASS} onClick={onSelect}>
      {body}
    </Link>
  ) : (
    <button type="button" className={ROW_CLASS} onClick={onSelect}>
      {body}
    </button>
  )
}
