import "server-only"
import { ObjectId, type Collection, type Filter } from "mongodb"

import { db } from "./mongodb"
import type { Lead, LeadDetails, LeadSource, LeadStatus } from "./leads-shared"

/**
 * Leads data layer. A "lead" is an incoming sales enquiry — from the marketing
 * site's contact form, the chatbot (Phase 2), or entered manually by staff.
 * All reads/writes go through here so the document shape stays in one place;
 * authorization lives in the server actions (`app/dashboard/actions.ts`).
 *
 * Client-safe constants and types (statuses, sources, labels, the `Lead` shape)
 * live in `./leads-shared` and are re-exported below, so Client Components can
 * import them from there without bundling the mongodb driver.
 */
export * from "./leads-shared"

/** Stored document shape. */
export type LeadDoc = {
  _id: ObjectId
  name: string
  email: string | null
  phone: string | null
  message: string | null
  source: LeadSource
  status: LeadStatus
  assignedToId: string | null
  assignedToName: string | null
  details?: LeadDetails | null
  createdAt: Date
  updatedAt: Date
}

export function leadsCollection(): Collection<LeadDoc> {
  return db.collection<LeadDoc>("leads")
}

export function serializeLead(doc: LeadDoc): Lead {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    message: doc.message,
    source: doc.source,
    status: doc.status,
    assignedToId: doc.assignedToId,
    assignedToName: doc.assignedToName,
    details: doc.details ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export type LeadQuery = {
  status?: LeadStatus
  /** Case-insensitive match against name / email / phone. */
  search?: string
  limit?: number
}

/** List leads newest-first, optionally filtered by status and a search term. */
export async function listLeads(query: LeadQuery = {}): Promise<Lead[]> {
  const filter: Filter<LeadDoc> = {}
  if (query.status) filter.status = query.status

  const search = query.search?.trim()
  if (search) {
    // Escape regex metacharacters so user input is matched literally.
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const rx = { $regex: safe, $options: "i" }
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]
  }

  const docs = await leadsCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(query.limit ?? 200, 500))
    .toArray()

  return docs.map(serializeLead)
}

/** A single lead by id, unscoped (staff/admin view). */
export async function getLeadById(id: string): Promise<Lead | null> {
  const doc = await leadsCollection().findOne({ _id: new ObjectId(id) })
  return doc ? serializeLead(doc) : null
}

/** A staff/superadmin user a lead can be assigned to. */
export type Assignee = { id: string; name: string; email: string }

/** Users eligible to own a lead (staff + superadmin), sorted by name. */
export async function listAssignees(): Promise<Assignee[]> {
  const docs = await db
    .collection("user")
    .find(
      { role: { $in: ["staff", "superadmin"] } },
      { projection: { name: 1, email: 1 } },
    )
    .sort({ name: 1 })
    .toArray()

  return docs.map((d) => ({
    id: String(d._id),
    name: (d.name as string | undefined) ?? "",
    email: (d.email as string | undefined) ?? "",
  }))
}
