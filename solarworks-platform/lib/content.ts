import "server-only"
import { ObjectId, type Collection } from "mongodb"

import { db } from "./mongodb"
import type {
  Audience,
  FaqCategory,
  FaqItem,
  ProjectItem,
  PublicFaq,
  PublicProject,
  PublicTestimonials,
  SystemType,
  TestimonialItem,
  TestimonialKind,
} from "./content-shared"

/**
 * CMS data layer. All reads/writes for the three content collections go through
 * here so the document shapes stay in one place; authorization lives in the CMS
 * server actions (`app/cms/actions.ts`) and the public read API only ever calls
 * the `listPublished*` helpers.
 *
 * Client-safe constants and types live in `./content-shared` and are re-exported
 * below, so Client Components can import them without bundling the mongodb driver.
 */
export * from "./content-shared"

// --- stored document shapes -------------------------------------------------

type ContentMetaDoc = {
  _id: ObjectId
  published: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type ProjectDoc = ContentMetaDoc & {
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
}

export type TestimonialDoc = ContentMetaDoc & {
  kind: TestimonialKind
  name: string
  location: string | null
  audience: Audience
  systemType: SystemType
  headline: string | null
  summary: string | null
  thumbnail: string | null
  videoId: string | null
  videoUrl: string | null
  quote: string | null
  photo: string | null
}

export type FaqDoc = ContentMetaDoc & {
  question: string
  answer: string
  category: FaqCategory
}

export function projectsCollection(): Collection<ProjectDoc> {
  return db.collection<ProjectDoc>("projects")
}
export function testimonialsCollection(): Collection<TestimonialDoc> {
  return db.collection<TestimonialDoc>("testimonials")
}
export function faqsCollection(): Collection<FaqDoc> {
  return db.collection<FaqDoc>("faqs")
}

// --- serializers (Doc → client-safe Item) -----------------------------------

export function serializeProject(d: ProjectDoc): ProjectItem {
  return {
    id: d._id.toString(),
    slug: d.slug,
    title: d.title,
    category: d.category,
    systemType: d.systemType,
    capacityKw: d.capacityKw,
    batteryKwh: d.batteryKwh,
    location: d.location,
    scope: d.scope,
    outcome: d.outcome,
    image: d.image,
    featured: d.featured,
    published: d.published,
    sortOrder: d.sortOrder,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

export function serializeTestimonial(d: TestimonialDoc): TestimonialItem {
  return {
    id: d._id.toString(),
    kind: d.kind,
    name: d.name,
    location: d.location,
    audience: d.audience,
    systemType: d.systemType,
    headline: d.headline,
    summary: d.summary,
    thumbnail: d.thumbnail,
    videoId: d.videoId,
    videoUrl: d.videoUrl,
    quote: d.quote,
    photo: d.photo,
    published: d.published,
    sortOrder: d.sortOrder,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

export function serializeFaq(d: FaqDoc): FaqItem {
  return {
    id: d._id.toString(),
    question: d.question,
    answer: d.answer,
    category: d.category,
    published: d.published,
    sortOrder: d.sortOrder,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

// --- admin reads (all items, sorted for the editor) -------------------------

/** Editor sort: by sortOrder then newest, so manual ordering wins. */
const EDITOR_SORT = { sortOrder: 1, createdAt: -1 } as const

export async function listProjects(): Promise<ProjectItem[]> {
  const docs = await projectsCollection().find().sort(EDITOR_SORT).toArray()
  return docs.map(serializeProject)
}

export async function listTestimonials(): Promise<TestimonialItem[]> {
  const docs = await testimonialsCollection().find().sort(EDITOR_SORT).toArray()
  return docs.map(serializeTestimonial)
}

export async function listFaqs(): Promise<FaqItem[]> {
  const docs = await faqsCollection().find().sort(EDITOR_SORT).toArray()
  return docs.map(serializeFaq)
}

// --- public reads (published only, mapped to the marketing-site shapes) ------

const PUBLIC_SORT = { sortOrder: 1, createdAt: -1 } as const

export async function listPublishedProjects(): Promise<PublicProject[]> {
  const docs = await projectsCollection()
    .find({ published: true })
    .sort(PUBLIC_SORT)
    .toArray()
  return docs.map((d) => ({
    slug: d.slug,
    title: d.title,
    category: d.category,
    systemType: d.systemType,
    capacityKw: d.capacityKw,
    ...(d.batteryKwh != null ? { batteryKwh: d.batteryKwh } : {}),
    location: d.location,
    scope: d.scope,
    outcome: d.outcome,
    image: d.image,
    featured: d.featured,
  }))
}

export async function listPublishedTestimonials(): Promise<PublicTestimonials> {
  const docs = await testimonialsCollection()
    .find({ published: true })
    .sort(PUBLIC_SORT)
    .toArray()

  const video = docs
    .filter((d) => d.kind === "video")
    .map((d) => ({
      id: d._id.toString(),
      name: d.name,
      ...(d.location ? { location: d.location } : {}),
      audience: d.audience,
      systemType: d.systemType,
      headline: d.headline ?? "",
      summary: d.summary ?? "",
      thumbnail: d.thumbnail ?? "",
      videoId: d.videoId ?? "",
      ...(d.videoUrl ? { videoUrl: d.videoUrl } : {}),
    }))

  const written = docs
    .filter((d) => d.kind === "written")
    .map((d) => ({
      id: d._id.toString(),
      quote: d.quote ?? "",
      name: d.name,
      ...(d.location ? { location: d.location } : {}),
      audience: d.audience,
      systemType: d.systemType,
      ...(d.photo ? { photo: d.photo } : {}),
    }))

  return { video, written }
}

export async function listPublishedFaqs(): Promise<PublicFaq[]> {
  const docs = await faqsCollection()
    .find({ published: true })
    .sort(PUBLIC_SORT)
    .toArray()
  return docs.map((d) => ({
    question: d.question,
    answer: d.answer,
    category: d.category,
  }))
}
