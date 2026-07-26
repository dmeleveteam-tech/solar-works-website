import "server-only"
import { createHash } from "node:crypto"
import { ObjectId, type Collection } from "mongodb"

import { db } from "./mongodb"
import type { Role } from "./permissions"
import { createTtlCache } from "./ttl-cache"
import { recipientFilter, feedWindowStart } from "./notifications-access"
import {
  BADGE_MAX,
  type AppNotification,
  type NotificationFeed,
  type NotificationType,
} from "./notifications-shared"

/**
 * In-app notifications data layer — the feed behind the header bell and the red
 * unread dots in the sidebar. All reads/writes go through here so the document
 * shape stays in one place; authorization lives in `app/api/notifications`.
 *
 * Targeting has two modes and every document uses exactly one:
 *  - `userId`  — one named recipient ("this lead was assigned to you")
 *  - `roles`   — everyone currently holding one of those roles ("a lead came in")
 *
 * A role broadcast stays a *single* document rather than one per user, so read
 * state can't live in a boolean — `readBy` records which recipients have read
 * it. That also means a user promoted into a role sees its recent history,
 * which is what staff expect from a shared inbox.
 *
 * Client-safe constants and types live in `./notifications-shared` and are
 * re-exported below, so Client Components can import them from there without
 * bundling the mongodb driver.
 *
 * Outbound email alerts are a separate concern and live in `./email-alerts`.
 */
export * from "./notifications-shared"
export * from "./notifications-access"

/** Stored document shape. */
export type NotificationDoc = {
  _id: ObjectId
  type: NotificationType
  title: string
  body: string | null
  href: string | null
  /** Sole recipient, or null when this is a role broadcast. */
  userId: string | null
  /** Recipient roles for a broadcast; empty when `userId` is set. */
  roles: Role[]
  /** User ids that have read this notification. */
  readBy: string[]
  /** Who triggered it — recipients never see their own actions. */
  actorId: string | null
  createdAt: Date
}

/** How many notifications the dropdown shows. */
const FEED_LIMIT = 30

/** How long a notification is kept before Mongo's TTL monitor removes it. */
const RETENTION_DAYS = 90

export function notificationsCollection(): Collection<NotificationDoc> {
  return db.collection<NotificationDoc>("notifications")
}

/**
 * Create the feed's indexes once per process. `createIndexes` is idempotent, so
 * this is safe to call on every read; the memo just avoids the round-trip. A
 * failure is logged and retried on the next call rather than breaking the feed —
 * an unindexed collection is slow, not wrong.
 */
let indexesReady: Promise<unknown> | null = null

function ensureIndexes(): Promise<unknown> {
  indexesReady ??= notificationsCollection()
    .createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { roles: 1, createdAt: -1 } },
      // TTL: prune old notifications so the collection can't grow unbounded.
      { key: { createdAt: 1 }, expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 },
    ])
    .catch((err) => {
      console.error("Notification index creation failed:", err)
      indexesReady = null
    })
  return indexesReady
}

// --- serialization ----------------------------------------------------------

export function serializeNotification(
  doc: NotificationDoc,
  userId: string,
): AppNotification {
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    body: doc.body,
    href: doc.href,
    read: (doc.readBy ?? []).includes(userId),
    createdAt: doc.createdAt.toISOString(),
  }
}

// --- reads ------------------------------------------------------------------

/** The newest notifications for this user, plus their unread count. */
export async function getNotificationFeed(
  userId: string,
  role: Role,
): Promise<NotificationFeed> {
  await ensureIndexes()

  const filter = recipientFilter(userId, role, feedWindowStart())
  const collection = notificationsCollection()

  const [docs, unreadCount] = await Promise.all([
    collection.find(filter).sort({ createdAt: -1 }).limit(FEED_LIMIT).toArray(),
    // Stop counting at the badge cap — past "99+" the exact number is noise.
    collection.countDocuments(
      { ...filter, readBy: { $ne: userId } },
      { limit: BADGE_MAX + 1 },
    ),
  ])

  return {
    items: docs.map((doc) => serializeNotification(doc, userId)),
    unreadCount,
  }
}

// --- cached reads -----------------------------------------------------------

/**
 * How long a computed feed is reused before the poll hits Mongo again. Well
 * under the client's poll interval, so a single tab still gets fresh data every
 * cycle; the win is with several tabs, several devices, or the refresh a user
 * triggers by focusing a window — those collapse onto one query.
 *
 * The cache is per process, so on serverless it bounds staleness rather than
 * guaranteeing a hit. Anything a user does to their own feed invalidates their
 * entry immediately; a role broadcast raised on another instance can be up to
 * this long behind, which is invisible next to a 30s poll.
 */
const FEED_CACHE_TTL_MS = 10_000

/** A feed plus the entity tag identifying its exact contents. */
export type FeedSnapshot = { feed: NotificationFeed; etag: string }

const feedCache = createTtlCache<FeedSnapshot & { role: Role }>({
  ttlMs: FEED_CACHE_TTL_MS,
  maxEntries: 1_000,
})

/** A weak tag over the serialized feed — read state included, so a mark-read changes it. */
function feedEtag(feed: NotificationFeed): string {
  const digest = createHash("sha1").update(JSON.stringify(feed)).digest("base64url")
  return `W/"${digest}"`
}

/**
 * The cached feed for a user, with its ETag. Callers should hand the ETag back
 * to the client so an unchanged feed can be answered with a 304.
 *
 * Keyed by user alone (not user + role) so invalidation is a single delete; a
 * role change simply misses and re-reads, which is also what we want — the
 * role scopes what the user is entitled to see.
 */
export async function readNotificationFeed(
  userId: string,
  role: Role,
): Promise<FeedSnapshot> {
  const cached = feedCache.get(userId)
  if (cached && cached.role === role) {
    return { feed: cached.feed, etag: cached.etag }
  }

  const feed = await getNotificationFeed(userId, role)
  const snapshot = { feed, etag: feedEtag(feed) }
  feedCache.set(userId, { ...snapshot, role })
  return snapshot
}

/** Drop a user's cached feed, so their next read goes to the database. */
export function invalidateNotificationFeed(userId: string): void {
  feedCache.delete(userId)
}

// --- writes -----------------------------------------------------------------

/** Mark one notification read. Returns false if it isn't the caller's to read. */
export async function markNotificationRead(
  userId: string,
  role: Role,
  id: string,
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false

  const { matchedCount } = await notificationsCollection().updateOne(
    {
      _id: new ObjectId(id),
      ...recipientFilter(userId, role, feedWindowStart()),
    },
    { $addToSet: { readBy: userId } },
  )
  invalidateNotificationFeed(userId)
  return matchedCount > 0
}

/** Mark every notification currently in this user's feed read. */
export async function markAllNotificationsRead(
  userId: string,
  role: Role,
): Promise<number> {
  const { modifiedCount } = await notificationsCollection().updateMany(
    recipientFilter(userId, role, feedWindowStart()),
    { $addToSet: { readBy: userId } },
  )
  invalidateNotificationFeed(userId)
  return modifiedCount
}

/** A notification aimed at one named user, or at everyone holding a role. */
export type NotifyTarget = { userId: string } | { roles: Role[] }

export type NotifyInput = NotifyTarget & {
  type: NotificationType
  title: string
  body?: string | null
  href?: string | null
  /** The user whose action raised this; they won't be notified about it. */
  actorId?: string | null
}

/**
 * Record a notification.
 *
 * Never throws: a notification is an aside to whatever the caller was really
 * doing, so a failure here must never fail a lead capture, a stage change, or a
 * publish. Failures are logged server-side only.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const userId = "userId" in input ? input.userId : null
  const actorId = input.actorId ?? null

  // Don't tell someone about their own action.
  if (userId && userId === actorId) return

  try {
    await notificationsCollection().insertOne({
      _id: new ObjectId(),
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      userId,
      roles: "roles" in input ? input.roles : [],
      readBy: [],
      actorId,
      createdAt: new Date(),
    })
    // A named recipient sees it on their very next poll. Role broadcasts can't
    // be invalidated per user, so they wait out the cache TTL instead.
    if (userId) invalidateNotificationFeed(userId)
  } catch (err) {
    console.error("Notification insert failed:", err)
  }
}
