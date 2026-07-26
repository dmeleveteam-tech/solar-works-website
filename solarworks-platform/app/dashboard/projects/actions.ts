"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { z } from "zod"

import { requireRole } from "@/lib/session"
import { db } from "@/lib/mongodb"
import { notify } from "@/lib/notifications"
import { createCustomerAccount } from "@/lib/customer-accounts"
import {
  PROJECT_STAGES,
  STAGE_LABEL,
  STAGE_DESCRIPTION,
  insertProject,
  setProjectStage,
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
  | { ok: true; data: T }
  | { ok: false; error: string }

const STAFF_ROLES = ["staff", "superadmin"] as const

const objectId = z.string().refine((v) => ObjectId.isValid(v), "Invalid id")

// Create a project, linking to either an existing customer account or a new one.
const createSchema = z.intersection(
  z.object({
    displayName: z.string().trim().min(1, "Project name is required").max(120),
    siteAddress: z.string().trim().max(300).optional().or(z.literal("")),
    linkedLeadId: objectId.optional(),
  }),
  z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("existing"), customerUserId: objectId }),
    z.object({
      mode: z.literal("new"),
      name: z.string().trim().min(1, "Customer name is required").max(120),
      email: z.string().trim().email("Invalid email").max(200),
      password: z.string().min(8, "Password must be at least 8 characters").max(200),
    }),
  ]),
)

const stageSchema = z.object({
  id: objectId,
  stage: z.enum(PROJECT_STAGES),
  stageNote: z.string().trim().max(1000).optional().or(z.literal("")),
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

  let customerUserId: string
  let customerName: string
  let customerEmail: string

  if (v.mode === "new") {
    const created = await createCustomerAccount({
      name: v.name,
      email: v.email,
      password: v.password,
    })
    if (!created.ok) return { ok: false, error: created.error }
    customerUserId = created.userId
    customerName = v.name
    customerEmail = v.email.trim().toLowerCase()
  } else {
    // Confirm the selected account exists and really is a customer.
    const user = await db
      .collection("user")
      .findOne(
        { _id: new ObjectId(v.customerUserId), role: "customer" },
        { projection: { name: 1, email: 1 } },
      )
    if (!user) return { ok: false, error: "That account isn't a customer." }
    customerUserId = v.customerUserId
    customerName = (user.name as string | undefined) ?? ""
    customerEmail = (user.email as string | undefined) ?? ""
  }

  const project = await insertProject({
    customerUserId,
    customerName,
    customerEmail,
    displayName: v.displayName,
    siteAddress: v.siteAddress ? v.siteAddress : null,
    linkedLeadId: v.linkedLeadId ?? null,
  })
  revalidatePath("/dashboard/projects")
  return { ok: true, data: project }
}

export async function updateProjectStage(
  input: z.input<typeof stageSchema>,
): Promise<ActionResult<CustomerProject>> {
  const session = await requireRole(...STAFF_ROLES)

  const parsed = stageSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." }
  }
  const { id, stage, stageNote } = parsed.data
  const project = await setProjectStage(id, stage, stageNote ? stageNote : null)
  if (!project) return { ok: false, error: "Project not found." }

  // The customer is the audience here — the staff member made this change.
  await notify({
    userId: project.customerUserId,
    type: "project_updated",
    title: `${project.displayName} moved to ${STAGE_LABEL[project.stage]}`,
    body: project.stageNote || STAGE_DESCRIPTION[project.stage],
    href: "/portal",
    actorId: session.user.id,
  })

  revalidatePath("/dashboard/projects")
  return { ok: true, data: project }
}

export async function addDocument(
  input: z.input<typeof addDocSchema>,
): Promise<ActionResult<CustomerProject>> {
  const session = await requireRole(...STAFF_ROLES)

  const parsed = addDocSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid document." }
  }
  const { id, label, url } = parsed.data
  const project = await addProjectDocument(id, { label, url })
  if (!project) return { ok: false, error: "Project not found." }

  await notify({
    userId: project.customerUserId,
    type: "project_updated",
    title: `New document — ${label}`,
    body: `Shared on ${project.displayName}`,
    href: "/portal",
    actorId: session.user.id,
  })

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
