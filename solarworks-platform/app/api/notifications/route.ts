import { NextResponse } from "next/server"

import { getSession } from "@/lib/session"
import { isRole } from "@/lib/permissions"
import { readNotificationFeed } from "@/lib/notifications"
import { clientKey, createRateLimiter, rateLimitHeaders } from "@/lib/rate-limit"

/**
 * The signed-in user's notification feed, polled by the header bell.
 *
 * Always scoped to the caller's own session — the client sends no identity of
 * its own, so there is nothing to forge. Unauthenticated callers get a 401 the
 * bell treats as "empty feed" rather than an error, since it also fires on a
 * session that expired in a background tab.
 *
 * Two cheap defences sit in front of the database:
 *  - a rate limit, checked by address before the session lookup (so a flood
 *    can't make us do auth work) and again by user id after it;
 *  - an ETag, so an unchanged feed answers 304 with no body. The feed itself is
 *    briefly cached per user in `lib/notifications`, so repeat polls inside that
 *    window don't query Mongo at all.
 */
export const dynamic = "force-dynamic"

/** ~2 polls/min per tab; the headroom covers many tabs and focus refreshes. */
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 })
/** Wider, by address: one office behind a single NAT is many signed-in staff. */
const addressLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 })

function tooMany(verdict: ReturnType<typeof limiter.check>) {
  return NextResponse.json(
    { ok: false, error: "Too many requests." },
    { status: 429, headers: rateLimitHeaders(verdict) },
  )
}

export async function GET(req: Request) {
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

  const { feed, etag } = await readNotificationFeed(session.user.id, role)

  const headers = {
    ...rateLimitHeaders(verdict),
    etag,
    // Never shared or served stale: this is one user's private feed.
    "cache-control": "private, no-cache, must-revalidate",
  }

  // Nothing has changed since the client's last poll — save the payload.
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers })
  }

  return NextResponse.json({ ok: true, ...feed }, { headers })
}
