"use client"

import * as React from "react"

import {
  EMPTY_FEED,
  type AppNotification,
  type NotificationFeed,
} from "@/lib/notifications-shared"

/**
 * Holds the signed-in user's notification feed for the whole shell, so the
 * header bell and the sidebar's red dots read one poll result instead of
 * fetching separately and disagreeing with each other.
 *
 * Delivery is polling, not a socket: the feed changes on the order of minutes
 * and the platform runs on serverless functions, where a long-lived connection
 * per signed-in user is the expensive option. Polling pauses while the tab is
 * hidden and resumes (with an immediate refresh) on focus.
 *
 * Each poll sends back the ETag of the feed it last saw, so an unchanged feed
 * costs a 304 with no body and no re-render — which is the common case. If the
 * server ever rate-limits us we honour its `retry-after` instead of hammering.
 */

const POLL_INTERVAL_MS = 30_000

/** Fallback pause when a 429 arrives without a usable `retry-after`. */
const DEFAULT_BACKOFF_MS = 60_000

type NotificationsValue = NotificationFeed & {
  /** True only until the first response lands, so the bell can stay quiet. */
  loading: boolean
  refresh: () => void
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotificationsContext = React.createContext<NotificationsValue | null>(null)

export function useNotifications(): NotificationsValue {
  const value = React.useContext(NotificationsContext)
  if (!value) {
    throw new Error("useNotifications must be used inside <NotificationsProvider>")
  }
  return value
}

/** Narrow an API response to a feed, ignoring anything malformed. */
function feedFrom(payload: unknown): NotificationFeed {
  if (!payload || typeof payload !== "object") return EMPTY_FEED
  const { items, unreadCount } = payload as {
    items?: unknown
    unreadCount?: unknown
  }
  if (!Array.isArray(items) || typeof unreadCount !== "number") return EMPTY_FEED
  return { items: items as AppNotification[], unreadCount }
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [feed, setFeed] = React.useState<NotificationFeed>(EMPTY_FEED)
  const [loading, setLoading] = React.useState(true)
  // Guards against overlapping polls when a request outlives the interval.
  const busy = React.useRef(false)
  // ETag of the feed currently on screen, sent back to skip unchanged payloads.
  const etag = React.useRef<string | null>(null)
  // Epoch ms before which we don't poll, set from a 429's `retry-after`.
  const pausedUntil = React.useRef(0)

  const refresh = React.useCallback(async () => {
    if (busy.current || Date.now() < pausedUntil.current) return
    busy.current = true
    try {
      const res = await fetch("/api/notifications", {
        cache: "no-store",
        headers: etag.current ? { "if-none-match": etag.current } : undefined,
      })

      // Unchanged since the last poll: nothing to parse, nothing to re-render.
      if (res.status === 304) return

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"))
        pausedUntil.current =
          Date.now() +
          (Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : DEFAULT_BACKOFF_MS)
        return
      }

      // A 401 means the session lapsed in a background tab: show an empty feed
      // rather than an error — the next navigation redirects to /login.
      if (!res.ok) {
        etag.current = null
        setFeed(EMPTY_FEED)
        return
      }

      etag.current = res.headers.get("etag")
      setFeed(feedFrom(await res.json()))
    } catch {
      // Offline or a dropped request — keep showing whatever we last had.
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined

    const start = () => {
      timer ??= setInterval(() => void refresh(), POLL_INTERVAL_MS)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = undefined
    }
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        stop()
        return
      }
      void refresh()
      start()
    }
    const onFocus = () => void refresh()

    // Deferred by a tick so the first load resolves after mount instead of
    // cascading a render out of the effect body.
    const initial = setTimeout(() => void refresh(), 0)
    if (document.visibilityState === "visible") start()

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("focus", onFocus)
    return () => {
      clearTimeout(initial)
      stop()
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("focus", onFocus)
    }
  }, [refresh])

  /** Send a read-mark and adopt the authoritative feed it responds with. */
  const postRead = React.useCallback(async (body: { id: string } | { all: true }) => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      })
      if (res.ok) {
        etag.current = res.headers.get("etag")
        setFeed(feedFrom(await res.json()))
        return
      }
      // The mark didn't land, so our optimistic state no longer matches the
      // ETag we hold. Drop it, or the next poll answers 304 and leaves the
      // wrong read state on screen indefinitely.
      etag.current = null
    } catch {
      etag.current = null
      // The optimistic update stands; the next poll reconciles it.
    }
  }, [])

  const markRead = React.useCallback(
    (id: string) => {
      setFeed((prev) => {
        const target = prev.items.find((item) => item.id === id)
        if (!target || target.read) return prev
        return {
          items: prev.items.map((item) =>
            item.id === id ? { ...item, read: true } : item,
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }
      })
      void postRead({ id })
    },
    [postRead],
  )

  const markAllRead = React.useCallback(() => {
    setFeed((prev) =>
      prev.unreadCount === 0
        ? prev
        : {
            items: prev.items.map((item) =>
              item.read ? item : { ...item, read: true },
            ),
            unreadCount: 0,
          },
    )
    void postRead({ all: true })
  }, [postRead])

  const value = React.useMemo<NotificationsValue>(
    () => ({
      items: feed.items,
      unreadCount: feed.unreadCount,
      loading,
      refresh: () => void refresh(),
      markRead,
      markAllRead,
    }),
    [feed, loading, refresh, markRead, markAllRead],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
