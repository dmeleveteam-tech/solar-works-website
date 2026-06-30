export type Audience = "Residential" | "Commercial" | "Farm"
export type SystemType = "Grid-Tied" | "Hybrid"

export type VideoTestimonial = {
  id: string
  name: string
  location?: string
  audience: Audience
  systemType: SystemType
  headline: string
  summary: string
  thumbnail: string
  // In production this maps to a YouTube/Vimeo embed; mock uses a placeholder id.
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

export const videoTestimonials: VideoTestimonial[] = [
  {
    id: "vt-1",
    name: "The Reyes Family",
    location: "Tagaytay, Cavite",
    audience: "Residential",
    systemType: "Hybrid",
    headline: "“No more dreading the brownouts.”",
    summary:
      "A hybrid system kept their home running through typhoon season and cut the bill they had quietly accepted for years.",
    thumbnail:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
    videoId: "mock-reyes",
  },
  {
    id: "vt-2",
    name: "Marisol D., Resort Owner",
    location: "San Juan, Batangas",
    audience: "Commercial",
    systemType: "Grid-Tied",
    headline: "“Our biggest bill, finally under control.”",
    summary:
      "The team designed the array around her resort's real daytime load instead of selling her a bigger system than she needed.",
    thumbnail:
      "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=1000&q=80",
    videoId: "mock-marisol",
  },
  {
    id: "vt-3",
    name: "Engr. Paolo S.",
    location: "Santa Rosa, Laguna",
    audience: "Residential",
    systemType: "Grid-Tied",
    headline: "“They got it right the first time.”",
    summary:
      "As an engineer himself, he scrutinized the design and workmanship — and came away recommending them to his whole street.",
    thumbnail:
      "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?auto=format&fit=crop&w=1000&q=80",
    videoId: "mock-paolo",
  },
]

export const writtenTestimonials: WrittenTestimonial[] = [
  {
    id: "wt-1",
    quote:
      "From the site visit to the final switch-on, everything was explained clearly. The installation is clean and tidy — you can tell they care about the details.",
    name: "Andrea L.",
    location: "Quezon City",
    audience: "Residential",
    systemType: "Hybrid",
  },
  {
    id: "wt-2",
    quote:
      "They didn't oversell us. They asked about how the farm actually runs, then designed around it. The backup has already paid off during two outages.",
    name: "Ramon T.",
    location: "Lucena, Quezon",
    audience: "Farm",
    systemType: "Hybrid",
  },
  {
    id: "wt-3",
    quote:
      "Professional from start to finish. The proposal was easy to understand and there were no surprise costs. Highly recommended.",
    name: "Grace M.",
    location: "Dasmariñas, Cavite",
    audience: "Commercial",
    systemType: "Grid-Tied",
  },
  {
    id: "wt-4",
    quote:
      "What sold me was talking to two of their past clients. Real proof, not just promises. The follow-up support has been excellent.",
    name: "Jun P.",
    location: "Batangas City",
    audience: "Residential",
    systemType: "Grid-Tied",
  },
  {
    id: "wt-5",
    quote:
      "Our electricity was the single largest cost we could actually control. Six months in, the difference is exactly what they projected.",
    name: "Sister Carmen R.",
    location: "Cavite",
    audience: "Commercial",
    systemType: "Grid-Tied",
  },
]
