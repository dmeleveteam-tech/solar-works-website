import { test } from "node:test"
import assert from "node:assert/strict"

import { activeNavItem, unreadByNavHref } from "./active-nav"
import type { NavItem } from "@/components/app-shell"
import { feedWindowStart, recipientFilter } from "./notifications-access"
import {
  BADGE_MAX,
  NOTIFICATION_ICON,
  NOTIFICATION_LABEL,
  NOTIFICATION_TYPES,
  badgeLabel,
  isNotificationType,
  relativeTime,
} from "./notifications-shared"

/**
 * Unit tests for the pure logic behind the notification feed. The data layer
 * itself talks to MongoDB, but its recipient scoping is pure and security-
 * critical, so it lives in `./notifications-access` and is locked down here
 * alongside the badge and nav-dot maths.
 */

// --- badge ------------------------------------------------------------------

test("badgeLabel spells out counts up to the cap and abbreviates past it", () => {
  assert.equal(badgeLabel(1), "1")
  assert.equal(badgeLabel(42), "42")
  assert.equal(badgeLabel(BADGE_MAX), String(BADGE_MAX))
  assert.equal(badgeLabel(BADGE_MAX + 1), `${BADGE_MAX}+`)
  assert.equal(badgeLabel(5000), `${BADGE_MAX}+`)
})

// --- type model -------------------------------------------------------------

test("every notification type has an icon and a label", () => {
  for (const type of NOTIFICATION_TYPES) {
    assert.equal(typeof NOTIFICATION_ICON[type], "string")
    assert.ok(NOTIFICATION_ICON[type].length > 0)
    assert.equal(typeof NOTIFICATION_LABEL[type], "string")
    assert.ok(NOTIFICATION_LABEL[type].length > 0)
  }
})

test("isNotificationType accepts known types and rejects anything else", () => {
  assert.ok(isNotificationType("lead_new"))
  assert.ok(isNotificationType("content_published"))
  assert.equal(isNotificationType("nope"), false)
  assert.equal(isNotificationType(""), false)
  assert.equal(isNotificationType(null), false)
  assert.equal(isNotificationType(7), false)
})

// --- relative time ----------------------------------------------------------

test("relativeTime bands elapsed time into minutes, hours, and days", () => {
  const now = new Date("2026-07-26T12:00:00.000Z")
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

  assert.equal(relativeTime(ago(5_000), now), "just now")
  assert.equal(relativeTime(ago(3 * 60_000), now), "3m ago")
  assert.equal(relativeTime(ago(5 * 3_600_000), now), "5h ago")
  assert.equal(relativeTime(ago(2 * 86_400_000), now), "2d ago")
})

test("relativeTime falls back to a date past a week, and tolerates junk", () => {
  const now = new Date("2026-07-26T12:00:00.000Z")
  const old = relativeTime(new Date("2026-06-01T12:00:00.000Z").toISOString(), now)
  assert.ok(!old.endsWith("ago"), `expected a date, got ${old}`)
  assert.equal(relativeTime("not-a-date", now), "")
})

// --- sidebar dots -----------------------------------------------------------

const NAV: NavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Leads", href: "/dashboard" },
  { label: "Customer projects", href: "/dashboard/projects" },
]

test("unreadByNavHref counts only unread notifications", () => {
  const counts = unreadByNavHref(
    [
      { href: "/dashboard", read: false },
      { href: "/dashboard", read: false },
      { href: "/dashboard", read: true },
    ],
    NAV,
  )
  assert.deepEqual(counts, { "/dashboard": 2 })
})

test("unreadByNavHref buckets to the longest matching nav item", () => {
  // `/dashboard` is a prefix of `/dashboard/projects`; the deeper item wins, so
  // a project notification must not inflate the Leads dot.
  const counts = unreadByNavHref(
    [
      { href: "/dashboard/projects", read: false },
      { href: "/dashboard", read: false },
    ],
    NAV,
  )
  assert.deepEqual(counts, { "/dashboard/projects": 1, "/dashboard": 1 })
  assert.equal(
    activeNavItem("/dashboard/projects", NAV)?.href,
    "/dashboard/projects",
  )
})

test("unreadByNavHref skips hrefs outside this role's nav, and null hrefs", () => {
  const counts = unreadByNavHref(
    [
      { href: "/cms", read: false },
      { href: null, read: false },
      { href: "/admin/users", read: false },
    ],
    NAV,
  )
  assert.deepEqual(counts, { "/admin/users": 1 })
})

// --- recipient targeting ----------------------------------------------------

test("recipientFilter binds the feed to the caller and their role", () => {
  const since = new Date("2026-07-01T00:00:00.000Z")
  const filter = recipientFilter("user-A", "staff", since)

  // Exactly two ways to be a recipient: named, or holding the role.
  assert.deepEqual(filter.$or, [{ userId: "user-A" }, { roles: "staff" }])
  // A user is never shown the fallout of their own action.
  assert.deepEqual(filter.actorId, { $ne: "user-A" })
  assert.deepEqual(filter.createdAt, { $gte: since })
})

test("a filter built for one user never matches another user's target", () => {
  const since = new Date("2026-07-01T00:00:00.000Z")

  const targets: Array<Record<string, unknown>> = recipientFilter(
    "user-A",
    "content_editor",
    since,
  ).$or

  assert.ok(targets.some((t) => t.userId === "user-A"))
  assert.ok(!targets.some((t) => t.userId === "user-B"))
  // A content editor's filter must not pick up staff broadcasts.
  assert.ok(!targets.some((t) => t.roles === "staff"))
})

test("feedWindowStart looks back a bounded, positive window", () => {
  const now = new Date("2026-07-26T12:00:00.000Z")
  const start = feedWindowStart(now)

  assert.ok(start.getTime() < now.getTime())
  const days = (now.getTime() - start.getTime()) / 86_400_000
  assert.ok(days > 0 && days <= 90, `window of ${days} days is out of range`)
})
