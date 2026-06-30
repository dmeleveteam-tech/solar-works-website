import { NextResponse } from "next/server"

import {
  CONTENT_TYPES,
  type ContentType,
  listPublishedProjects,
  listPublishedTestimonials,
  listPublishedFaqs,
} from "@/lib/content"

/**
 * Public, read-only content API for the marketing site.
 *
 * Returns ONLY published items, in the exact shape the landing app's static
 * content modules used to export — so swapping static data for live data is a
 * near drop-in change. There is nothing privileged here (published content is
 * public by definition), so no auth key is required; the marketing app caches
 * responses with its own ISR window.
 *
 * GET /api/content/projects      → PublicProject[]
 * GET /api/content/testimonials  → { video: [...], written: [...] }
 * GET /api/content/faqs          → PublicFaq[]
 */

// Always read fresh from the DB; the consumer (marketing site) does the caching.
export const dynamic = "force-dynamic"

function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params
  if (!isContentType(type)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 })
  }

  try {
    switch (type) {
      case "projects":
        return NextResponse.json(await listPublishedProjects())
      case "testimonials":
        return NextResponse.json(await listPublishedTestimonials())
      case "faqs":
        return NextResponse.json(await listPublishedFaqs())
    }
  } catch (err) {
    // Never leak internals to the caller; log server-side for debugging.
    console.error(`[content api] failed to load ${type}:`, err)
    return NextResponse.json({ error: "Failed to load content." }, { status: 500 })
  }
}
