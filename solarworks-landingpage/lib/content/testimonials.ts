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
  videoId: string
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
]

// No written testimonials are published yet — real quotes will be added here (or
// via the CMS) once collected with client consent. Kept empty rather than mocked.
export const writtenTestimonials: WrittenTestimonial[] = []
