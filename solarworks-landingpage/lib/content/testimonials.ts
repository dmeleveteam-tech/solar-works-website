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
  // Facebook video embed URL — used instead of videoId for Facebook-hosted content.
  facebookEmbedUrl?: string
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
    facebookEmbedUrl:
      "https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F4382754665384766%2F&show_text=false&width=560&t=0",
  },
  {
    id: "vt-fb-reel-02",
    name: "Solar Works Customer",
    audience: "Residential",
    headline: "Switching to solar — a customer's journey",
    summary:
      "Hear directly from a Solar Works customer about their solar journey and results.",
    thumbnail: "/images/testimonials/fb-reel-thumb-2.png",
    facebookEmbedUrl:
      "https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1230926652252153%2F&show_text=false&width=380&t=0",
  },
]

// No written testimonials are published yet — real quotes will be added here (or
// via the CMS) once collected with client consent. Kept empty rather than mocked.
export const writtenTestimonials: WrittenTestimonial[] = []
