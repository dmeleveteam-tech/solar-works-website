"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { z } from "zod"

import { requireRole } from "@/lib/session"
import { db } from "@/lib/mongodb"
import {
  leadsCollection,
  serializeLead,
  listLeads,
  LEAD_STATUSES,
  LEAD_SOURCES,
  type Lead,
  type LeadDoc,
  type LeadStatus,
} from "@/lib/leads"

/**
 * Server Actions for the staff lead inbox. Every action re-verifies the caller's
 * role server-side (never trust the client): staff and superadmin may read,
 * create, update, and assign; deletion is superadmin-only. This mirrors the
 * `lead` permissions declared in `lib/permissions.ts`.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const STAFF_ROLES = ["staff", "superadmin"] as const

// --- validation -------------------------------------------------------------

const objectId = z
  .string()
  .refine((v) => ObjectId.isValid(v), "Invalid id")

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z.enum(LEAD_SOURCES).default("manual"),
})

const statusSchema = z.object({
  id: objectId,
  status: z.enum(LEAD_STATUSES),
})

const assignSchema = z.object({
  id: objectId,
  // null clears the assignment.
  assigneeId: objectId.nullable(),
})

// --- read -------------------------------------------------------------------

const listSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
})

export async function getLeads(input: {
  status?: LeadStatus
  search?: string
}): Promise<ActionResult<Lead[]>> {
  await requireRole(...STAFF_ROLES)
  const parsed = listSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Invalid filter." }
  }
  const leads = await listLeads(parsed.data)
  return { ok: true, data: leads }
}

// --- mutations --------------------------------------------------------------

export async function createLead(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<Lead>> {
  await requireRole(...STAFF_ROLES)

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid lead." }
  }
  const v = parsed.data
  const now = new Date()
  const doc: LeadDoc = {
    _id: new ObjectId(),
    name: v.name,
    email: v.email ? v.email : null,
    phone: v.phone ? v.phone : null,
    message: v.message ? v.message : null,
    source: v.source,
    status: "new",
    assignedToId: null,
    assignedToName: null,
    createdAt: now,
    updatedAt: now,
  }

  await leadsCollection().insertOne(doc)
  revalidatePath("/dashboard")
  return { ok: true, data: serializeLead(doc) }
}

export async function updateLeadStatus(
  input: z.input<typeof statusSchema>,
): Promise<ActionResult<Lead>> {
  await requireRole(...STAFF_ROLES)

  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Invalid status update." }
  }

  const result = await leadsCollection().findOneAndUpdate(
    { _id: new ObjectId(parsed.data.id) },
    { $set: { status: parsed.data.status, updatedAt: new Date() } },
    { returnDocument: "after" },
  )
  if (!result) return { ok: false, error: "Lead not found." }
  revalidatePath("/dashboard")
  return { ok: true, data: serializeLead(result) }
}

export async function assignLead(
  input: z.input<typeof assignSchema>,
): Promise<ActionResult<Lead>> {
  await requireRole(...STAFF_ROLES)

  const parsed = assignSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Invalid assignment." }
  }
  const { id, assigneeId } = parsed.data

  let assignedToId: string | null = null
  let assignedToName: string | null = null

  if (assigneeId) {
    // Confirm the assignee exists and is staff/superadmin before assigning.
    const user = await db
      .collection("user")
      .findOne(
        { _id: new ObjectId(assigneeId), role: { $in: [...STAFF_ROLES] } },
        { projection: { name: 1, email: 1 } },
      )
    if (!user) return { ok: false, error: "That user can't own leads." }
    assignedToId = assigneeId
    assignedToName = (user.name as string | undefined) || (user.email as string)
  }

  const result = await leadsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { assignedToId, assignedToName, updatedAt: new Date() } },
    { returnDocument: "after" },
  )
  if (!result) return { ok: false, error: "Lead not found." }
  revalidatePath("/dashboard")
  return { ok: true, data: serializeLead(result) }
}

export async function deleteLead(input: {
  id: string
}): Promise<ActionResult> {
  // Deletion is destructive — superadmin only.
  await requireRole("superadmin")

  const parsed = objectId.safeParse(input.id)
  if (!parsed.success) return { ok: false, error: "Invalid id." }

  const { deletedCount } = await leadsCollection().deleteOne({
    _id: new ObjectId(parsed.data),
  })
  if (!deletedCount) return { ok: false, error: "Lead not found." }
  revalidatePath("/dashboard")
  return { ok: true, data: undefined }
}
