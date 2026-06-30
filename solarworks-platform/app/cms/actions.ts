"use server"

import { revalidatePath } from "next/cache"
import { ObjectId, type Collection, type Filter, type UpdateFilter } from "mongodb"
import { z } from "zod"

import { requireRole } from "@/lib/session"
import {
  projectsCollection,
  testimonialsCollection,
  faqsCollection,
  serializeProject,
  serializeTestimonial,
  serializeFaq,
  listProjects,
  listTestimonials,
  listFaqs,
  AUDIENCES,
  SYSTEM_TYPES,
  FAQ_CATEGORIES,
  TESTIMONIAL_KINDS,
  type ProjectItem,
  type TestimonialItem,
  type FaqItem,
  type ProjectDoc,
  type TestimonialDoc,
  type FaqDoc,
} from "@/lib/content"

/**
 * Server Actions for the CMS. Every action re-verifies the caller's role
 * server-side: content editors and superadmins may manage content; staff can
 * only read (their access is enforced by the route's `requireRole`). This
 * mirrors the `content` permissions declared in `lib/permissions.ts`.
 *
 * After any mutation we `revalidatePath("/cms")` for the editor. The public
 * marketing site picks up changes through its own ISR revalidation window on
 * the read API (`app/api/content/[type]`).
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

const CONTENT_ROLES = ["content_editor", "superadmin"] as const

const objectId = z.string().refine((v) => ObjectId.isValid(v), "Invalid id")

const idSchema = z.object({ id: objectId })
const publishSchema = z.object({ id: objectId, published: z.boolean() })
const reorderSchema = z.object({ ids: z.array(objectId).min(1).max(1000) })

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input."
}

/** First message per top-level field, for inline display next to each input. */
function fieldErrorsFrom(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of err.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !(key in out)) out[key] = issue.message
  }
  return out
}

/** Standard validation failure: a summary message plus per-field messages. */
function invalid(err: z.ZodError): { ok: false; error: string; fieldErrors: Record<string, string> } {
  return { ok: false, error: firstError(err), fieldErrors: fieldErrorsFrom(err) }
}

/**
 * Persist a drag-reordered list: rewrite each item's `sortOrder` to its index in
 * `ids`, so the editor and the public site (both sorted by `sortOrder` asc) show
 * the new order. Items not in `ids` keep their existing sortOrder. Validation and
 * the role check happen in the calling action.
 */
type Orderable = { _id: ObjectId; sortOrder: number; updatedAt: Date }

async function applyOrder<T extends Orderable>(
  collection: () => Collection<T>,
  ids: string[],
): Promise<void> {
  const now = new Date()
  await collection().bulkWrite(
    ids.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) } as Filter<T>,
        update: { $set: { sortOrder: index, updatedAt: now } } as UpdateFilter<T>,
      },
    })),
  )
}

// --- projects ---------------------------------------------------------------

const slug = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and dashes")

const projectSchema = z.object({
  slug,
  title: z.string().trim().min(1, "Title is required").max(160),
  category: z.enum(AUDIENCES),
  systemType: z.enum(SYSTEM_TYPES),
  capacityKw: z.coerce.number().positive("Capacity must be greater than 0").max(100000),
  batteryKwh: z.coerce
    .number()
    .min(0)
    .max(100000)
    .nullable()
    .optional()
    .transform((v) => (v == null || Number.isNaN(v) ? null : v)),
  location: z.string().trim().min(1, "Location is required").max(160),
  scope: z.string().trim().min(1, "Scope is required").max(1000),
  outcome: z.string().trim().min(1, "Outcome is required").max(1000),
  image: z.string().trim().url("Image must be a valid URL").max(500),
  featured: z.coerce.boolean().default(false),
  published: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
})

/** Reject a slug already used by a *different* project. */
async function slugTaken(value: string, exceptId?: string): Promise<boolean> {
  const filter: Record<string, unknown> = { slug: value }
  if (exceptId) filter._id = { $ne: new ObjectId(exceptId) }
  return (await projectsCollection().countDocuments(filter, { limit: 1 })) > 0
}

export async function getProjects(): Promise<ActionResult<ProjectItem[]>> {
  await requireRole(...CONTENT_ROLES)
  return { ok: true, data: await listProjects() }
}

export async function createProject(
  input: z.input<typeof projectSchema>,
): Promise<ActionResult<ProjectItem>> {
  await requireRole(...CONTENT_ROLES)
  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const v = parsed.data

  if (await slugTaken(v.slug)) {
    return { ok: false, error: "That slug is already in use.", fieldErrors: { slug: "That slug is already in use." } }
  }

  const now = new Date()
  const doc: ProjectDoc = { _id: new ObjectId(), ...v, createdAt: now, updatedAt: now }
  await projectsCollection().insertOne(doc)
  revalidatePath("/cms")
  return { ok: true, data: serializeProject(doc) }
}

export async function updateProject(
  input: { id: string } & z.input<typeof projectSchema>,
): Promise<ActionResult<ProjectItem>> {
  await requireRole(...CONTENT_ROLES)
  const id = idSchema.safeParse({ id: input.id })
  if (!id.success) return { ok: false, error: "Invalid id." }
  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  if (await slugTaken(parsed.data.slug, input.id)) {
    return { ok: false, error: "That slug is already in use.", fieldErrors: { slug: "That slug is already in use." } }
  }

  const result = await projectsCollection().findOneAndUpdate(
    { _id: new ObjectId(input.id) },
    { $set: { ...parsed.data, updatedAt: new Date() } },
    { returnDocument: "after" },
  )
  if (!result) return { ok: false, error: "Project not found." }
  revalidatePath("/cms")
  return { ok: true, data: serializeProject(result) }
}

export async function setProjectPublished(
  input: z.input<typeof publishSchema>,
): Promise<ActionResult<ProjectItem>> {
  await requireRole(...CONTENT_ROLES)
  const parsed = publishSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request." }
  const result = await projectsCollection().findOneAndUpdate(
    { _id: new ObjectId(parsed.data.id) },
    { $set: { published: parsed.data.published, updatedAt: new Date() } },
    { returnDocument: "after" },
  )
  if (!result) return { ok: false, error: "Project not found." }
  revalidatePath("/cms")
  return { ok: true, data: serializeProject(result) }
}

export async function deleteProject(input: { id: string }): Promise<ActionResult> {
  await requireRole(...CONTENT_ROLES)
  const parsed = objectId.safeParse(input.id)
  if (!parsed.success) return { ok: false, error: "Invalid id." }
  const { deletedCount } = await projectsCollection().deleteOne({
    _id: new ObjectId(parsed.data),
  })
  if (!deletedCount) return { ok: false, error: "Project not found." }
  revalidatePath("/cms")
  return { ok: true, data: undefined }
}

// --- testimonials -----------------------------------------------------------

const testimonialSchema = z
  .object({
    kind: z.enum(TESTIMONIAL_KINDS),
    name: z.string().trim().min(1, "Name is required").max(120),
    location: z.string().trim().max(160).optional().or(z.literal("")),
    audience: z.enum(AUDIENCES),
    systemType: z.enum(SYSTEM_TYPES),
    // video
    headline: z.string().trim().max(200).optional().or(z.literal("")),
    summary: z.string().trim().max(1000).optional().or(z.literal("")),
    thumbnail: z.string().trim().max(500).optional().or(z.literal("")),
    videoId: z.string().trim().max(200).optional().or(z.literal("")),
    // written
    quote: z.string().trim().max(1000).optional().or(z.literal("")),
    photo: z.string().trim().max(500).optional().or(z.literal("")),
    published: z.coerce.boolean().default(false),
    sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "video") {
      if (!v.headline)
        ctx.addIssue({ code: "custom", path: ["headline"], message: "Headline is required for a video testimonial" })
      if (!v.summary)
        ctx.addIssue({ code: "custom", path: ["summary"], message: "Summary is required for a video testimonial" })
      if (!v.thumbnail)
        ctx.addIssue({ code: "custom", path: ["thumbnail"], message: "Thumbnail URL is required for a video testimonial" })
      if (!v.videoId)
        ctx.addIssue({ code: "custom", path: ["videoId"], message: "Video ID/embed is required for a video testimonial" })
    } else if (v.kind === "written") {
      if (!v.quote)
        ctx.addIssue({ code: "custom", path: ["quote"], message: "Quote is required for a written testimonial" })
    }
    for (const [key, val] of [["thumbnail", v.thumbnail], ["photo", v.photo]] as const) {
      if (val && !/^https?:\/\//i.test(val)) {
        ctx.addIssue({ code: "custom", path: [key], message: "Must be a valid URL" })
      }
    }
  })

/** Normalize the validated form into a stored testimonial document body. */
function testimonialBody(v: z.infer<typeof testimonialSchema>) {
  const blank = (s: string | undefined) => (s ? s : null)
  const isVideo = v.kind === "video"
  return {
    kind: v.kind,
    name: v.name,
    location: blank(v.location),
    audience: v.audience,
    systemType: v.systemType,
    headline: isVideo ? blank(v.headline) : null,
    summary: isVideo ? blank(v.summary) : null,
    thumbnail: isVideo ? blank(v.thumbnail) : null,
    videoId: isVideo ? blank(v.videoId) : null,
    quote: isVideo ? null : blank(v.quote),
    photo: isVideo ? null : blank(v.photo),
    published: v.published,
    sortOrder: v.sortOrder,
  }
}

export async function getTestimonials(): Promise<ActionResult<TestimonialItem[]>> {
  await requireRole(...CONTENT_ROLES)
  return { ok: true, data: await listTestimonials() }
}

export async function createTestimonial(
  input: z.input<typeof testimonialSchema>,
): Promise<ActionResult<TestimonialItem>> {
  await requireRole(...CONTENT_ROLES)
  const parsed = testimonialSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const now = new Date()
  const doc: TestimonialDoc = {
    _id: new ObjectId(),
    ...testimonialBody(parsed.data),
    createdAt: now,
    updatedAt: now,
  }
  await testimonialsCollection().insertOne(doc)
  revalidatePath("/cms")
  return { ok: true, data: serializeTestimonial(doc) }
}

export async function updateTestimonial(
  input: { id: string } & z.input<typeof testimonialSchema>,
): Promise<ActionResult<TestimonialItem>> {
  await requireRole(...CONTENT_ROLES)
  const id = idSchema.safeParse({ id: input.id })
  if (!id.success) return { ok: false, error: "Invalid id." }
  const parsed = testimonialSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  const result = await testimonialsCollection().findOneAndUpdate(
    { _id: new ObjectId(input.id) },
    { $set: { ...testimonialBody(parsed.data), updatedAt: new Date() } },
    { returnDocument: "after" },
  )
  if (!result) return { ok: false, error: "Testimonial not found." }
  revalidatePath("/cms")
  return { ok: true, data: serializeTestimonial(result) }
}

export async function setTestimonialPublished(
  input: z.input<typeof publishSchema>,
): Promise<ActionResult<TestimonialItem>> {
  await requireRole(...CONTENT_ROLES)
  const parsed = publishSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request." }
  const result = await testimonialsCollection().findOneAndUpdate(
    { _id: new ObjectId(parsed.data.id) },
    { $set: { published: parsed.data.published, updatedAt: new Date() } },
    { returnDocument: "after" },
  )
  if (!result) return { ok: false, error: "Testimonial not found." }
  revalidatePath("/cms")
  return { ok: true, data: serializeTestimonial(result) }
}

export async function deleteTestimonial(input: { id: string }): Promise<ActionResult> {
  await requireRole(...CONTENT_ROLES)
  const parsed = objectId.safeParse(input.id)
  if (!parsed.success) return { ok: false, error: "Invalid id." }
  const { deletedCount } = await testimonialsCollection().deleteOne({
    _id: new ObjectId(parsed.data),
  })
  if (!deletedCount) return { ok: false, error: "Testimonial not found." }
  revalidatePath("/cms")
  return { ok: true, data: undefined }
}

// --- faqs -------------------------------------------------------------------

const faqSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(300),
  answer: z.string().trim().min(1, "Answer is required").max(2000),
  category: z.enum(FAQ_CATEGORIES),
  published: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
})

export async function getFaqs(): Promise<ActionResult<FaqItem[]>> {
  await requireRole(...CONTENT_ROLES)
  return { ok: true, data: await listFaqs() }
}

export async function createFaq(
  input: z.input<typeof faqSchema>,
): Promise<ActionResult<FaqItem>> {
  await requireRole(...CONTENT_ROLES)
  const parsed = faqSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const now = new Date()
  const doc: FaqDoc = { _id: new ObjectId(), ...parsed.data, createdAt: now, updatedAt: now }
  await faqsCollection().insertOne(doc)
  revalidatePath("/cms")
  return { ok: true, data: serializeFaq(doc) }
}

export async function updateFaq(
  input: { id: string } & z.input<typeof faqSchema>,
): Promise<ActionResult<FaqItem>> {
  await requireRole(...CONTENT_ROLES)
  const id = idSchema.safeParse({ id: input.id })
  if (!id.success) return { ok: false, error: "Invalid id." }
  const parsed = faqSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const result = await faqsCollection().findOneAndUpdate(
    { _id: new ObjectId(input.id) },
    { $set: { ...parsed.data, updatedAt: new Date() } },
    { returnDocument: "after" },
  )
  if (!result) return { ok: false, error: "FAQ not found." }
  revalidatePath("/cms")
  return { ok: true, data: serializeFaq(result) }
}

export async function setFaqPublished(
  input: z.input<typeof publishSchema>,
): Promise<ActionResult<FaqItem>> {
  await requireRole(...CONTENT_ROLES)
  const parsed = publishSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request." }
  const result = await faqsCollection().findOneAndUpdate(
    { _id: new ObjectId(parsed.data.id) },
    { $set: { published: parsed.data.published, updatedAt: new Date() } },
    { returnDocument: "after" },
  )
  if (!result) return { ok: false, error: "FAQ not found." }
  revalidatePath("/cms")
  return { ok: true, data: serializeFaq(result) }
}

export async function deleteFaq(input: { id: string }): Promise<ActionResult> {
  await requireRole(...CONTENT_ROLES)
  const parsed = objectId.safeParse(input.id)
  if (!parsed.success) return { ok: false, error: "Invalid id." }
  const { deletedCount } = await faqsCollection().deleteOne({
    _id: new ObjectId(parsed.data),
  })
  if (!deletedCount) return { ok: false, error: "FAQ not found." }
  revalidatePath("/cms")
  return { ok: true, data: undefined }
}

// --- reordering -------------------------------------------------------------

export async function reorderProjects(input: { ids: string[] }): Promise<ActionResult> {
  await requireRole(...CONTENT_ROLES)
  const parsed = reorderSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request." }
  await applyOrder(projectsCollection, parsed.data.ids)
  revalidatePath("/cms")
  return { ok: true, data: undefined }
}

export async function reorderTestimonials(input: { ids: string[] }): Promise<ActionResult> {
  await requireRole(...CONTENT_ROLES)
  const parsed = reorderSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request." }
  await applyOrder(testimonialsCollection, parsed.data.ids)
  revalidatePath("/cms")
  return { ok: true, data: undefined }
}

export async function reorderFaqs(input: { ids: string[] }): Promise<ActionResult> {
  await requireRole(...CONTENT_ROLES)
  const parsed = reorderSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request." }
  await applyOrder(faqsCollection, parsed.data.ids)
  revalidatePath("/cms")
  return { ok: true, data: undefined }
}
