import "server-only"

import { projects as fallbackProjects, type Project } from "./projects"
import {
  videoTestimonials as fallbackVideo,
  writtenTestimonials as fallbackWritten,
  type VideoTestimonial,
  type WrittenTestimonial,
} from "./testimonials"
import { faqs as fallbackFaqs, type Faq } from "./site-content"

/**
 * Live content read from the Solar Works platform (the back-office CMS), with the
 * previously hard-coded arrays kept as a graceful fallback. These run on the
 * server only — pages call them and pass the result down to client components.
 *
 * Set `PLATFORM_CONTENT_URL` to the platform's content API base, e.g.
 * `http://localhost:3001/api/content`. When it's unset OR a request fails, we
 * fall back to the bundled static content so the marketing site always renders.
 *
 * Responses are cached with ISR (`revalidate`), so publishing in the CMS shows
 * up within the revalidation window without a redeploy.
 */

const BASE = process.env.PLATFORM_CONTENT_URL?.replace(/\/$/, "")

// 5 minutes: fresh enough for content edits, cheap enough to serve cached.
const REVALIDATE_SECONDS = 300

async function fetchContent<T>(type: string, fallback: T): Promise<T> {
  if (!BASE) return fallback
  try {
    const res = await fetch(`${BASE}/${type}`, {
      // Tagged so the CMS can drop this exact cache entry on demand (see
      // app/api/revalidate) the instant something is deleted, published, or
      // edited — `revalidate` below is only the fallback ceiling for when
      // that on-demand call doesn't fire (env unset, request failed, etc).
      next: { revalidate: REVALIDATE_SECONDS, tags: [type] },
    })
    if (!res.ok) throw new Error(`content api ${type} → ${res.status}`)
    return (await res.json()) as T
  } catch (err) {
    // Log server-side and degrade to static content; never break the page.
    console.error(`[content] falling back to static "${type}":`, err)
    return fallback
  }
}

export async function getProjects(): Promise<Project[]> {
  return fetchContent<Project[]>("projects", fallbackProjects)
}

export async function getFeaturedProjects(): Promise<Project[]> {
  return (await getProjects()).filter((p) => p.featured)
}

export type Testimonials = {
  video: VideoTestimonial[]
  written: WrittenTestimonial[]
}

export async function getTestimonials(): Promise<Testimonials> {
  return fetchContent<Testimonials>("testimonials", {
    video: fallbackVideo,
    written: fallbackWritten,
  })
}

export async function getFaqs(): Promise<Faq[]> {
  return fetchContent<Faq[]>("faqs", fallbackFaqs)
}
