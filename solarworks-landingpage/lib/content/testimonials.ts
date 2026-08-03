export type Audience = "Residential" | "Commercial" | "Farm"
export type SystemType = "Grid-Tied" | "Hybrid"

export type VideoTestimonial = {
  id: string
  name: string
  location?: string
  audience: Audience
  // Optional: only shown when confirmed with the client (no guessed system type).
  systemType?: SystemType
  headline: string
  summary: string
  thumbnail: string
  // Real YouTube video id — embedded as https://www.youtube.com/embed/<videoId>.
  videoId?: string
  // Uploaded video file URL (from the platform CMS). Takes priority over
  // videoId when present — played inline with a native <video> element.
  videoUrl?: string
  // Public Facebook reel/video URL. We link out to it (opens on Facebook) rather
  // than embedding the FB social plugin inline, because browsers' tracking
  // prevention (e.g. Microsoft Edge, on by default) blocks facebook.com plugin
  // frames and replaces them with a "This page has been blocked" interstitial.
  facebookUrl?: string
}

export type WrittenTestimonial = {
  id: string
  quote: string
  name: string
  location?: string
  audience: Audience
  systemType: SystemType
  photo?: string
}

// No video testimonials are bundled statically — they're published and managed
// entirely through the platform CMS (PLATFORM_CONTENT_URL). Kept empty rather
// than hardcoded so the marketing site never ships stale/fake customer content.
export const videoTestimonials: VideoTestimonial[] = []

// No written testimonials are published yet — real quotes will be added here (or
// via the CMS) once collected with client consent. Kept empty rather than mocked.
export const writtenTestimonials: WrittenTestimonial[] = []
