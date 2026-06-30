/**
 * Seed the CMS collections (projects / testimonials / faqs) with the content the
 * marketing site previously hard-coded, so the public site isn't empty once it
 * reads live data.
 *
 *   pnpm seed:content
 *
 * Idempotent: each item is upserted by a natural key (project slug, FAQ question,
 * testimonial name+kind), so re-running won't create duplicates. Everything is
 * seeded as `published: true`. Reads MONGODB_URI / MONGODB_DB from .env.
 */
import "dotenv/config"
import { MongoClient } from "mongodb"

type Audience = "Residential" | "Commercial" | "Farm"
type SystemType = "Grid-Tied" | "Hybrid"

const projects: Array<{
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
  featured: boolean
}> = [
  {
    slug: "tagaytay-hybrid-home",
    title: "Hillside Family Home",
    category: "Residential",
    systemType: "Hybrid",
    capacityKw: 8.2,
    batteryKwh: 10,
    location: "Tagaytay, Cavite",
    scope: "Rooftop hybrid system with battery backup for a four-bedroom home prone to brownouts.",
    outcome: "Roughly 70% lower monthly bill and uninterrupted power during outages.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    featured: true,
  },
  {
    slug: "batangas-resort",
    title: "Lakeside Resort",
    category: "Commercial",
    systemType: "Grid-Tied",
    capacityKw: 45,
    batteryKwh: null,
    location: "San Juan, Batangas",
    scope: "Ground-mount and rooftop array sized around peak daytime guest load.",
    outcome: "Significant cut in daytime grid draw across the dry season.",
    image: "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=1200&q=80",
    featured: true,
  },
  {
    slug: "laguna-grid-tied",
    title: "Suburban Grid-Tied Home",
    category: "Residential",
    systemType: "Grid-Tied",
    capacityKw: 6,
    batteryKwh: null,
    location: "Santa Rosa, Laguna",
    scope: "Clean rooftop install with net-metering on a modern two-storey home.",
    outcome: "Daytime consumption almost fully offset by solar.",
    image: "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?auto=format&fit=crop&w=1200&q=80",
    featured: true,
  },
  {
    slug: "quezon-poultry-farm",
    title: "Poultry Farm",
    category: "Farm",
    systemType: "Hybrid",
    capacityKw: 30,
    batteryKwh: 40,
    location: "Lucena, Quezon",
    scope: "Hybrid system keeping ventilation and cooling running through outages.",
    outcome: "Protected livestock from heat events during grid failures.",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    slug: "cavite-school",
    title: "Private School Campus",
    category: "Commercial",
    systemType: "Grid-Tied",
    capacityKw: 60,
    batteryKwh: null,
    location: "Dasmariñas, Cavite",
    scope: "Multi-building rooftop array sized to weekday classroom load.",
    outcome: "Lower operating cost redirected to learning programs.",
    image: "https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    slug: "manila-carport",
    title: "Residential Solar Carport",
    category: "Residential",
    systemType: "Hybrid",
    capacityKw: 7.5,
    batteryKwh: 10,
    location: "Quezon City, Metro Manila",
    scope: "Carport-mounted array with battery and EV-ready charging point.",
    outcome: "Shade, backup power, and EV charging from one structure.",
    image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
]

const videoTestimonials = [
  {
    name: "The Reyes Family",
    location: "Tagaytay, Cavite",
    audience: "Residential" as Audience,
    systemType: "Hybrid" as SystemType,
    headline: "“No more dreading the brownouts.”",
    summary:
      "A hybrid system kept their home running through typhoon season and cut the bill they had quietly accepted for years.",
    thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
    videoId: "mock-reyes",
  },
  {
    name: "Marisol D., Resort Owner",
    location: "San Juan, Batangas",
    audience: "Commercial" as Audience,
    systemType: "Grid-Tied" as SystemType,
    headline: "“Our biggest bill, finally under control.”",
    summary:
      "The team designed the array around her resort's real daytime load instead of selling her a bigger system than she needed.",
    thumbnail: "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=1000&q=80",
    videoId: "mock-marisol",
  },
  {
    name: "Engr. Paolo S.",
    location: "Santa Rosa, Laguna",
    audience: "Residential" as Audience,
    systemType: "Grid-Tied" as SystemType,
    headline: "“They got it right the first time.”",
    summary:
      "As an engineer himself, he scrutinized the design and workmanship — and came away recommending them to his whole street.",
    thumbnail: "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?auto=format&fit=crop&w=1000&q=80",
    videoId: "mock-paolo",
  },
]

const writtenTestimonials = [
  {
    quote:
      "From the site visit to the final switch-on, everything was explained clearly. The installation is clean and tidy — you can tell they care about the details.",
    name: "Andrea L.",
    location: "Quezon City",
    audience: "Residential" as Audience,
    systemType: "Hybrid" as SystemType,
  },
  {
    quote:
      "They didn't oversell us. They asked about how the farm actually runs, then designed around it. The backup has already paid off during two outages.",
    name: "Ramon T.",
    location: "Lucena, Quezon",
    audience: "Farm" as Audience,
    systemType: "Hybrid" as SystemType,
  },
  {
    quote:
      "Professional from start to finish. The proposal was easy to understand and there were no surprise costs. Highly recommended.",
    name: "Grace M.",
    location: "Dasmariñas, Cavite",
    audience: "Commercial" as Audience,
    systemType: "Grid-Tied" as SystemType,
  },
  {
    quote:
      "What sold me was talking to two of their past clients. Real proof, not just promises. The follow-up support has been excellent.",
    name: "Jun P.",
    location: "Batangas City",
    audience: "Residential" as Audience,
    systemType: "Grid-Tied" as SystemType,
  },
  {
    quote:
      "Our electricity was the single largest cost we could actually control. Six months in, the difference is exactly what they projected.",
    name: "Sister Carmen R.",
    location: "Cavite",
    audience: "Commercial" as Audience,
    systemType: "Grid-Tied" as SystemType,
  },
]

const faqs = [
  {
    question: "How much does a solar system cost?",
    answer:
      "It depends on your consumption, roof, and whether you need battery backup. After a quick assessment we give you a clear, itemized proposal — no obligation and no surprise costs.",
    category: "Cost & Savings",
  },
  {
    question: "How much can I really save?",
    answer:
      "Savings depend on your usage pattern and system size. We model your actual bill rather than promise a fixed number, so the projection you see is grounded in your real consumption.",
    category: "Cost & Savings",
  },
  {
    question: "What warranties do you offer?",
    answer:
      "Panels carry a 20-year warranty and batteries a 10-year warranty, plus lifetime after-sales support while your products are under warranty.",
    category: "Warranties",
  },
  {
    question: "Do I need a battery?",
    answer:
      "Not always. If your goal is simply a lower bill and your grid is stable, grid-tied is the most cost-effective option. If you experience frequent brownouts, a hybrid system with battery keeps you powered.",
    category: "Battery",
  },
  {
    question: "How long does installation take?",
    answer:
      "Most residential installations are completed within a few days once the design is approved and materials are on site. We confirm the exact timeline in your proposal.",
    category: "Installation",
  },
  {
    question: "What is net metering?",
    answer:
      "Net metering lets a grid-tied system export surplus daytime energy back to the utility for credits. We handle the application and documentation as part of the project.",
    category: "General",
  },
]

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI is not set.")
    process.exit(1)
  }
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(process.env.MONGODB_DB ?? "solarworks")
  const now = new Date()

  // Projects — keyed by slug.
  let p = 0
  for (const [i, proj] of projects.entries()) {
    await db.collection("projects").updateOne(
      { slug: proj.slug },
      {
        $set: { ...proj, published: true, sortOrder: i, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )
    p++
  }
  console.log(`✓ Projects seeded: ${p}`)

  // Testimonials — keyed by kind + name.
  let t = 0
  for (const [i, v] of videoTestimonials.entries()) {
    await db.collection("testimonials").updateOne(
      { kind: "video", name: v.name },
      {
        $set: {
          kind: "video",
          name: v.name,
          location: v.location,
          audience: v.audience,
          systemType: v.systemType,
          headline: v.headline,
          summary: v.summary,
          thumbnail: v.thumbnail,
          videoId: v.videoId,
          quote: null,
          photo: null,
          published: true,
          sortOrder: i,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )
    t++
  }
  for (const [i, w] of writtenTestimonials.entries()) {
    await db.collection("testimonials").updateOne(
      { kind: "written", name: w.name },
      {
        $set: {
          kind: "written",
          name: w.name,
          location: w.location,
          audience: w.audience,
          systemType: w.systemType,
          headline: null,
          summary: null,
          thumbnail: null,
          videoId: null,
          quote: w.quote,
          photo: null,
          published: true,
          sortOrder: i,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )
    t++
  }
  console.log(`✓ Testimonials seeded: ${t}`)

  // FAQs — keyed by question.
  let f = 0
  for (const [i, faq] of faqs.entries()) {
    await db.collection("faqs").updateOne(
      { question: faq.question },
      {
        $set: { ...faq, published: true, sortOrder: i, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )
    f++
  }
  console.log(`✓ FAQs seeded: ${f}`)

  await client.close()
  process.exit(0)
}

main().catch((err) => {
  console.error("Content seed failed:", err)
  process.exit(1)
})
