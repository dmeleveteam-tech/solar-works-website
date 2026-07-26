import { NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/session"
import { isRole } from "@/lib/permissions"
import {
  markAllNotificationsRead,
  markNotificationRead,
  readNotificationFeed,
} from "@/lib/notifications"
import { clientKey, createRateLimiter, rateLimitHeaders } from "@/lib/rate-limit"

/**
 * Mark one notification (or all of them) read for the signed-in user.
 *
 * The mark is scoped to the caller's own feed inside the data layer, so passing
 * someone else's notification id is a no-op rather than a leak. Responds with
 * the refreshed feed so the bell updates in one round-trip.
 *
 * Rate limited like the feed route, but tighter: this one writes, and marking
 * read is a click, not a poll.
 */
export const dynamic = "force-dynamic"

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 })
const addressLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 })

const bodySchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ id: z.string().min(1).max(64) }),
])

function tooMany(verdict: ReturnType<typeof limiter.check>) {
  return NextResponse.json(
    { ok: false, error: "Too many requests." },
    { status: 429, headers: rateLimitHeaders(verdict) },
  )
}

export async function POST(req: Request) {
  const byAddress = addressLimiter.check(clientKey(req.headers))
  if (!byAddress.ok) return tooMany(byAddress)

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })
  }

  const role = session.user.role
  if (!isRole(role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 403 })
  }

  const verdict = limiter.check(session.user.id)
  if (!verdict.ok) return tooMany(verdict)

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 422 })
  }

  const userId = session.user.id
  if ("all" in parsed.data) {
    await markAllNotificationsRead(userId, role)
  } else {
    await markNotificationRead(userId, role, parsed.data.id)
  }

  // The marks above invalidated this user's cached feed, so this reads fresh.
  const { feed, etag } = await readNotificationFeed(userId, role)

  return NextResponse.json(
    { ok: true, ...feed },
    {
      headers: {
        ...rateLimitHeaders(verdict),
        etag,
        "cache-control": "private, no-cache, must-revalidate",
      },
    },
  )
}
