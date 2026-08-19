/**
 * Client-safe content constants and types for the CMS. Like `leads-shared`, this
 * module has NO `server-only` or mongodb import, so the CMS editor (a Client
 * Component) can import the enums, labels, and serialized item shapes without
 * pulling the database driver into the browser bundle. Server-only data access
 * lives in `./content`, which re-exports everything here.
 *
 * Four content collections back the public marketing site:
 *   - projects      → Our Work / featured projects on Home
 *   - testimonials  → Customer Stories (video + written) + Home proof
 *   - faqs          → Learning Center / Solutions FAQ accordions
 *   - solutions     → the 4 solution cards on Home ("A system that fits how
 *                     you actually live") and the Solar Solutions page
 */

// --- shared enums -----------------------------------------------------------

export const CONTENT_TYPES = ["projects", "testimonials", "faqs", "solutions"] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export const AUDIENCES = ["Residential", "Commercial", "Farm"] as const
export type Audience = (typeof AUDIENCES)[number]

export const SYSTEM_TYPES = ["Grid-Tied", "Hybrid"] as const
export type SystemType = (typeof SYSTEM_TYPES)[number]

export const FAQ_CATEGORIES = [
  "Cost & Savings",
  "Warranties",
  "Battery",
  "Installation",
  "General",
] as const
export type FaqCategory = (typeof FAQ_CATEGORIES)[number]

export const TESTIMONIAL_KINDS = ["video", "written"] as const
export type TestimonialKind = (typeof TESTIMONIAL_KINDS)[number]

/**
 * The 4 solution cards are a fixed set, each pinned to a specific icon and
 * anchor on the marketing site (`/solar-solutions#<slug>`), so the slug is a
 * closed list here rather than free text like a project's.
 */
export const SOLUTION_SLUGS = [
  "grid-tied",
  "hybrid-with-battery",
  "commercial-farm-carport",
  "solar-carport",
] as const
export type SolutionSlug = (typeof SOLUTION_SLUGS)[number]

export const SOLUTION_SLUG_LABEL: Record<SolutionSlug, string> = {
  "grid-tied": "Grid-Tied Solar",
  "hybrid-with-battery": "Hybrid with Battery",
  "commercial-farm-carport": "Commercial, Farm & Carport",
  "solar-carport": "Solar Carport",
}

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  projects: "Projects",
  testimonials: "Testimonials",
  faqs: "FAQs",
  solutions: "Solutions",
}

// --- serialized item shapes (ObjectId / Date serialized to strings) ---------

/** Lifecycle fields shared by every content item. */
type ContentMeta = {
  id: string
  published: boolean
  /** Ascending display order; lower numbers surface first. */
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type ProjectItem = ContentMeta & {
  slug: string
  title: string
  category: Audience
  systemType: SystemType
  capacityKw: number
  batteryKwh: number | null
  location: string
  scope: string
  outcome: string
  image: string
  /** Featured projects surface on the Home page. */
  featured: boolean
}

export type TestimonialItem = ContentMeta & {
  kind: TestimonialKind
  name: string
  location: string | null
  audience: Audience
  systemType: SystemType
  // video-only
  headline: string | null
  summary: string | null
  thumbnail: string | null
  videoId: string | null
  /** Uploaded video file URL (Cloudinary) — an alternative to `videoId`. */
  videoUrl: string | null
  // written-only
  quote: string | null
  photo: string | null
  /** Link to the original review (Google, Facebook, etc.) — optional. */
  sourceUrl: string | null
}

export type FaqItem = ContentMeta & {
  question: string
  answer: string
  category: FaqCategory
}

export type SolutionItem = ContentMeta & {
  slug: SolutionSlug
  name: string
  /** Short "who this is for" line shown under the name. */
  forWho: string
  summary: string
  /** Bullet points; one per line in the editor. */
  highlights: string[]
  image: string
}

export type ContentItem = ProjectItem | TestimonialItem | FaqItem | SolutionItem

// --- public shapes (what the marketing site consumes via the read API) ------
//
// These mirror the marketing app's existing static types exactly, so swapping
// the static arrays for live data is a near drop-in change. Lifecycle fields
// (published, sortOrder, timestamps) are intentionally omitted from the public
// payload.

export type PublicProject = {
  slug: string
  title: string
  category: Audience
  systemType: SystemType
  capacityKw: number
  batteryKwh?: number
  location: string
  scope: string
  outcome: string
  image: string
  featured: boolean
}

export type PublicVideoTestimonial = {
  id: string
  name: string
  location?: string
  audience: Audience
  systemType: SystemType
  headline: string
  summary: string
  thumbnail: string
  videoId: string
  /** Uploaded video file URL — when present, the site plays this instead of the YouTube embed. */
  videoUrl?: string
}

export type PublicWrittenTestimonial = {
  id: string
  quote: string
  name: string
  location?: string
  audience: Audience
  systemType: SystemType
  photo?: string
  /** Link to the original review (Google, Facebook, etc.) — optional. */
  sourceUrl?: string
}

export type PublicTestimonials = {
  video: PublicVideoTestimonial[]
  written: PublicWrittenTestimonial[]
}

export type PublicFaq = {
  question: string
  answer: string
  category: FaqCategory
}

export type PublicSolution = {
  slug: SolutionSlug
  name: string
  forWho: string
  summary: string
  highlights: string[]
  image: string
}
