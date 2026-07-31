"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { z } from "zod"

import { requireRole } from "@/lib/session"
import { notifyProjectStageChanged } from "@/lib/email-alerts"
import { getLeadById, leadsCollection } from "@/lib/leads"
import {
  PROJECT_STAGES,
  insertProject,
  setProjectStage,
  getProjectById,
  addProjectDocument,
  removeProjectDocument,
  deleteProject,
  listAllProjects,
  type CustomerProject,
} from "@/lib/customer-projects"

/**
 * Server Actions for the staff customer-projects manager. Every action
 * re-verifies the caller's role server-side: staff and superadmin may read,
 * create, and update; deletion is superadmin-only. Mirrors the leads inbox and
 * the `project` permissions in `lib/permissions.ts`.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T; warning?: string }
  | { ok: false; error: string }

const STAFF_ROLES = ["staff", "superadmin"] as const

const objectId = z.string().refine((v) => ObjectId.isValid(v), "Invalid id")

// Create a standalone project directly from typed contact info (no lead, no
// account) — the manual fallback for customers who never went through Leads.
const createSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  email: z.string().trim().email("Invalid email").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  displayName: z.string().trim().min(1, "Project name is required").max(120),
  siteAddress: z.string().trim().max(300).optional().or(z.literal("")),
})

const convertLeadSchema = z.object({
  leadId: objectId,
  displayName: z.string().trim().min(1, "Project name is required").max(120),
  siteAddress: z.string().trim().max(300).optional().or(z.literal("")),
})

const stageSchema = z
  .object({
    id: objectId,
    stage: z.enum(PROJECT_STAGES),
    stageNote: z.string().trim().max(1000).optional().or(z.literal("")),
    // Datetime-local input value (e.g. "2026-08-14T09:00"). Required when
    // moving into "scheduled" so the customer email always has a date to send.
    scheduledAt: z.string().trim().optional().or(z.literal("")),
  })
  .refine((v) => v.stage !== "scheduled" || Boolean(v.scheduledAt), {
    message: "Set a schedule date/time.",
    path: ["scheduledAt"],
  })

const addDocSchema = z.object({
  id: objectId,
  label: z.string().trim().min(1, "Document label is required").max(120),
  // The URL is produced by our own Cloudinary upload flow; constrain to https.
  url: z.string().trim().url().max(500).startsWith("https://", "Must be an https URL"),
})

const removeDocSchema = z.object({ id: objectId, documentId: z.string().min(1).max(100) })

export async function getProjects(): Promise<ActionResult<CustomerProject[]>> {
  await requireRole(...STAFF_ROLES)
  return { ok: true, data: await listAllProjects() }
}

export async function createProject(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<CustomerProject>> {
  await requireRole(...STAFF_ROLES)

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid project." }
  }
  const v = parsed.data

  const project = await insertProject({
    customerName: v.name,
    customerEmail: v.email.trim().toLowerCase(),
    customerPhone: v.phone ? v.phone : null,
    displayName: v.displayName,
    siteAddress: v.siteAddress ? v.siteAddress : null,
    linkedLeadId: null,
  })
  revalidatePath("/dashboard/projects")
  return { ok: true, data: project }
}

/**
 * Turn a lead into a customer project. The lead's name/email/phone seed the
 * project's contact fields; `linkedLeadId` records the origin. Requires the
 * lead to have an email — the project's only notification channel
 * (`notifyProjectStageChanged`) sends to `customerEmail`, so a project
 * without one would silently never notify anybody.
 */
export async function convertLeadToProject(
  input: z.input<typeof convertLeadSchema>,
): Promise<ActionResult<CustomerProject>> {
  await requireRole(...STAFF_ROLES)

  const parsed = convertLeadSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." }
  }
  const { leadId, displayName, siteAddress } = parsed.data

  const lead = await getLeadById(leadId)
  if (!lead) return { ok: false, error: "Lead not found." }
  if (!lead.email) {
    return { ok: false, error: "This lead has no email on file; add one before converting." }
  }

  const project = await insertProject({
    customerName: lead.name,
    customerEmail: lead.email,
    customerPhone: lead.phone,
    displayName,
    siteAddress: siteAddress ? siteAddress : null,
    linkedLeadId: lead.id,
  })

  // Converting is the sales outcome "won" represents — flip the lead's status
  // so the pipeline and the projects list agree without a second manual step.
  // Staff can still override it via the existing status dropdown.
  await leadsCollection().updateOne(
    { _id: new ObjectId(leadId) },
    { $set: { status: "won", updatedAt: new Date() } },
  )

  revalidatePath("/dashboard/projects")
  revalidatePath("/dashboard")
  return { ok: true, data: project }
}

export async function updateProjectStage(
  input: z.input<typeof stageSchema>,
): Promise<ActionResult<CustomerProject>> {
  await requireRole(...STAFF_ROLES)

  const parsed = stageSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." }
  }
  const { id, stage, stageNote, scheduledAt } = parsed.data

  // Captured before the write so the notification can say what the stage
  // actually changed *from* — findOneAndUpdate only ever hands back one side.
  const before = await getProjectById(id)
  if (!before) return { ok: false, error: "Project not found." }
  const previousStage = before.stage

  const project = await setProjectStage(
    id,
    stage,
    stageNote ? stageNote : null,
    // Leave the stored schedule untouched when the field wasn't submitted
    // (i.e. the stage editor was showing a non-"scheduled" stage).
    scheduledAt ? new Date(scheduledAt) : undefined,
  )
  if (!project) return { ok: false, error: "Project not found." }

  // Email the customer on every stage transition (not just moves into
  // "scheduled") — an in-app notification alone is easy to miss. A note-only
  // save with no stage change doesn't re-send the email.
  let warning: string | undefined
  if (project.stage !== previousStage) {
    const emailResult = await notifyProjectStageChanged(project, previousStage)
    if (!emailResult.sent) {
      warning = `Stage updated, but the customer email wasn't sent (${
        emailResult.error ?? emailResult.skippedReason ?? "unknown reason"
      }).`
    }
  }

  revalidatePath("/dashboard/projects")
  return { ok: true, data: project, warning }
}

export async function addDocument(
  input: z.input<typeof addDocSchema>,
): Promise<ActionResult<CustomerProject>> {
  await requireRole(...STAFF_ROLES)

  const parsed = addDocSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid document." }
  }
  const { id, label, url } = parsed.data
  const project = await addProjectDocument(id, { label, url })
  if (!project) return { ok: false, error: "Project not found." }

  revalidatePath("/dashboard/projects")
  return { ok: true, data: project }
}

export async function removeDocument(
  input: z.input<typeof removeDocSchema>,
): Promise<ActionResult<CustomerProject>> {
  await requireRole(...STAFF_ROLES)

  const parsed = removeDocSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request." }
  const { id, documentId } = parsed.data
  const project = await removeProjectDocument(id, documentId)
  if (!project) return { ok: false, error: "Project not found." }
  revalidatePath("/dashboard/projects")
  return { ok: true, data: project }
}

export async function removeProject(input: {
  id: string
}): Promise<ActionResult> {
  // Deletion is destructive — superadmin only.
  await requireRole("superadmin")

  const parsed = objectId.safeParse(input.id)
  if (!parsed.success) return { ok: false, error: "Invalid id." }
  const deleted = await deleteProject(parsed.data)
  if (!deleted) return { ok: false, error: "Project not found." }
  revalidatePath("/dashboard/projects")
  return { ok: true, data: undefined }
}
