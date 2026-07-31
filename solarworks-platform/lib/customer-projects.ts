import "server-only"
import { randomUUID } from "node:crypto"
import { ObjectId, type Collection, type Filter } from "mongodb"

import { db } from "./mongodb"
import { customerScope } from "./customer-projects-access"
import type {
  CustomerProject,
  ProjectDocument,
  ProjectStage,
} from "./customer-projects-shared"

/**
 * Customer-projects data layer (Phase 2a customer portal). One document per
 * customer engagement, owned by exactly one customer account. Authorization
 * lives in the server actions (`app/dashboard/projects/actions.ts`) for staff
 * writes and in the portal page for customer reads — but every customer-facing
 * query is also scoped to the owner here, so a customer can never read another
 * customer's project even if a higher layer slips.
 *
 * Client-safe constants/types live in `./customer-projects-shared`, re-exported
 * below so Client Components can import them without the mongodb driver.
 */
export * from "./customer-projects-shared"

/** Stored document shape. */
export type CustomerProjectDoc = {
  _id: ObjectId
  customerName: string
  customerEmail: string
  customerPhone: string | null
  displayName: string
  siteAddress: string | null
  stage: ProjectStage
  stageNote: string | null
  stageUpdatedAt: Date
  scheduledAt: Date | null
  documents: ProjectDocument[]
  linkedLeadId: string | null
  createdAt: Date
  updatedAt: Date
}

export function customerProjectsCollection(): Collection<CustomerProjectDoc> {
  return db.collection<CustomerProjectDoc>("customerProjects")
}

// --- ownership-scoped filters (pure; unit-tested) ---------------------------

/**
 * Filter for every project owned by `customerUserId`. The customer portal must
 * only ever query through this (or `ownedProjectFilter`), so ownership is part
 * of the query rather than a post-fetch check that could be forgotten.
 */
export function customerScopeFilter(
  customerUserId: string,
): Filter<CustomerProjectDoc> {
  return customerScope(customerUserId)
}

/** Filter for a single project that must be owned by `customerUserId`. */
export function ownedProjectFilter(
  id: string,
  customerUserId: string,
): Filter<CustomerProjectDoc> {
  return { _id: new ObjectId(id), ...customerScope(customerUserId) }
}

// --- serialization ----------------------------------------------------------

export function serializeCustomerProject(
  doc: CustomerProjectDoc,
): CustomerProject {
  return {
    id: doc._id.toString(),
    customerName: doc.customerName,
    customerEmail: doc.customerEmail,
    customerPhone: doc.customerPhone,
    displayName: doc.displayName,
    siteAddress: doc.siteAddress,
    stage: doc.stage,
    stageNote: doc.stageNote,
    stageUpdatedAt: doc.stageUpdatedAt.toISOString(),
    scheduledAt: doc.scheduledAt ? doc.scheduledAt.toISOString() : null,
    documents: doc.documents ?? [],
    linkedLeadId: doc.linkedLeadId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

// --- customer reads (always owner-scoped) -----------------------------------

/** Projects owned by this customer, newest first. */
export async function listProjectsForCustomer(
  customerUserId: string,
): Promise<CustomerProject[]> {
  const docs = await customerProjectsCollection()
    .find(customerScopeFilter(customerUserId))
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map(serializeCustomerProject)
}

// --- staff reads ------------------------------------------------------------

/** Every project, newest first (staff/admin view). */
export async function listAllProjects(): Promise<CustomerProject[]> {
  const docs = await customerProjectsCollection()
    .find()
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map(serializeCustomerProject)
}

/** A single project by id, unscoped (staff/admin view). */
export async function getProjectById(id: string): Promise<CustomerProject | null> {
  const doc = await customerProjectsCollection().findOne({ _id: new ObjectId(id) })
  return doc ? serializeCustomerProject(doc) : null
}

// --- staff writes -----------------------------------------------------------

export type CreateProjectInput = {
  customerName: string
  customerEmail: string
  customerPhone: string | null
  displayName: string
  siteAddress: string | null
  linkedLeadId: string | null
}

export async function insertProject(
  input: CreateProjectInput,
): Promise<CustomerProject> {
  const now = new Date()
  const doc: CustomerProjectDoc = {
    _id: new ObjectId(),
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    displayName: input.displayName,
    siteAddress: input.siteAddress,
    stage: "assessment",
    stageNote: null,
    stageUpdatedAt: now,
    scheduledAt: null,
    documents: [],
    linkedLeadId: input.linkedLeadId,
    createdAt: now,
    updatedAt: now,
  }
  await customerProjectsCollection().insertOne(doc)
  return serializeCustomerProject(doc)
}

export async function setProjectStage(
  id: string,
  stage: ProjectStage,
  stageNote: string | null,
  /** Omit to leave the existing schedule untouched; pass null to clear it. */
  scheduledAt?: Date | null,
): Promise<CustomerProject | null> {
  const now = new Date()
  const set: Record<string, unknown> = { stage, stageNote, stageUpdatedAt: now, updatedAt: now }
  if (scheduledAt !== undefined) set.scheduledAt = scheduledAt
  const result = await customerProjectsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: set },
    { returnDocument: "after" },
  )
  return result ? serializeCustomerProject(result) : null
}

export async function addProjectDocument(
  id: string,
  input: { label: string; url: string },
): Promise<CustomerProject | null> {
  const docEntry: ProjectDocument = {
    id: randomUUID(),
    label: input.label,
    url: input.url,
    uploadedAt: new Date().toISOString(),
  }
  const result = await customerProjectsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $push: { documents: docEntry },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  )
  return result ? serializeCustomerProject(result) : null
}

export async function removeProjectDocument(
  id: string,
  documentId: string,
): Promise<CustomerProject | null> {
  const result = await customerProjectsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $pull: { documents: { id: documentId } },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  )
  return result ? serializeCustomerProject(result) : null
}

export async function deleteProject(id: string): Promise<boolean> {
  const { deletedCount } = await customerProjectsCollection().deleteOne({
    _id: new ObjectId(id),
  })
  return deletedCount > 0
}
