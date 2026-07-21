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

// Real, published customer video testimonials provided by Solar Works (public on
// YouTube, with consent). Location and system type are intentionally omitted until
// confirmed with the client — we don't guess those fields.
export const videoTestimonials: VideoTestimonial[] = [
  {
    id: "vt-corciga",
    name: "Mr. Ric Corciga",
    audience: "Residential",
    headline: "Why going solar made sense for our family long-term",
    summary: "A family's perspective on the long-term value of going solar.",
    thumbnail: "https://img.youtube.com/vi/Q7F2BEHBiQw/hqdefault.jpg",
    videoId: "Q7F2BEHBiQw",
  },
  {
    id: "vt-raca",
    name: "Ms. Zeny Raca",
    audience: "Residential",
    headline: "From high electric bills to big savings",
    summary:
      "A homeowner's story of moving from high electricity bills to meaningful savings with solar.",
    thumbnail: "https://img.youtube.com/vi/-l_882YKEPg/hqdefault.jpg",
    videoId: "-l_882YKEPg",
  },
  {
    id: "vt-fb-reel-01",
    name: "Solar Works Customer",
    audience: "Residential",
    headline: "A real customer shares their solar experience",
    summary:
      "Watch this customer share their firsthand experience with Solar Works.",
    thumbnail: "/images/testimonials/fb-reel-thumb.png",
    facebookUrl: "https://www.facebook.com/reel/4382754665384766/",
  },
  {
    id: "vt-fb-reel-02",
    name: "Solar Works Customer",
    audience: "Residential",
    headline: "Switching to solar — a customer's journey",
    summary:
      "Hear directly from a Solar Works customer about their solar journey and results.",
    thumbnail: "/images/testimonials/fb-reel-thumb-2.png",
    facebookUrl: "https://www.facebook.com/reel/1230926652252153/",
  },
]

// No written testimonials are published yet — real quotes will be added here (or
// via the CMS) once collected with client consent. Kept empty rather than mocked.
export const writtenTestimonials: WrittenTestimonial[] = []
