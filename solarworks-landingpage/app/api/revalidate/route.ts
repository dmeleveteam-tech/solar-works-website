import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

/**
 * On-demand cache purge, called by the platform CMS right after a content
 * mutation (create/update/delete/publish toggle/reorder) — so a delete or
 * edit shows up on the live site immediately instead of waiting out
 * `lib/content/api.ts`'s ISR window (up to 5 minutes).
 *
 * POST /api/revalidate  body: { type: "projects" | "testimonials" | "faqs" | "solutions" }
 * Header: x-revalidate-secret — must equal REVALIDATE_SECRET.
 *
 * Not wired to anything if REVALIDATE_SECRET is unset — the site still works,
 * it just falls back to the plain ISR window like before.
 */

const CONTENT_TYPES = ["projects", "testimonials", "faqs", "solutions"] as const
type ContentType = (typeof CONTENT_TYPES)[number]

function isContentType(value: unknown): value is ContentType {
  return typeof value === "string" && (CONTENT_TYPES as readonly string[]).includes(value)
}

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const type = (body as { type?: unknown } | null)?.type
  if (!isContentType(type)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 400 })
  }

  // Next 16 requires a cache-life profile here, but it only governs "use
  // cache"/cacheTag lifetimes — this route just purges a plain fetch()
  // `tags` entry (lib/content/api.ts), so the profile itself is inert here.
  // "max" (never auto-expires) keeps that intent explicit: no revalidation
  // happens without an on-demand call like this one.
  revalidateTag(type, "max")
  return NextResponse.json({ revalidated: true, type })
}
