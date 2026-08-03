import type { Role } from "./permissions"

/**
 * Pure recipient-scoping helpers for the notification feed. Kept free of
 * `server-only`/mongodb imports — the type-only `Filter` import is erased at
 * build — so the security-critical invariant (a user only ever reads their own
 * notifications) can be unit-tested without a database. The server data layer
 * in `./notifications` composes these into its queries.
 */

/** How far back the bell looks. Older notifications stop counting as unread. */
export const FEED_WINDOW_DAYS = 30

/** Shape of the recipient scope, kept explicit so the tests can assert on it. */
export type RecipientScope = {
  createdAt: { $gte: Date }
  actorId: { $ne: string }
  $or: [{ userId: string }, { roles: Role }]
}

/**
 * Every notification `userId` (holding `role`) is entitled to see. This is the
 * only way the feed is ever queried, so a user can't read another user's
 * notifications even if a higher layer slips — the ownership test is part of
 * the query, not a post-fetch check that could be forgotten.
 *
 * `actorId: { $ne: userId }` also matches documents whose actor is null, so
 * system-generated notifications still reach everyone.
 */
export function recipientFilter(
  userId: string,
  role: Role,
  since: Date,
): RecipientScope {
  return {
    createdAt: { $gte: since },
    actorId: { $ne: userId },
    $or: [{ userId }, { roles: role }],
  }
}

/** Start of the visible window, `FEED_WINDOW_DAYS` before `now`. */
export function feedWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - FEED_WINDOW_DAYS * 24 * 60 * 60 * 1000)
}
