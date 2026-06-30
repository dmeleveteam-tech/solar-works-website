/**
 * Client-safe customer-project constants, types, and the serialized shape.
 * Like `leads-shared`, this has NO `server-only`/mongodb import, so Client
 * Components (the portal view, the staff projects manager) can import the enums,
 * labels, and `CustomerProject` shape without pulling in the database driver.
 * Server-only data access lives in `./customer-projects`.
 */

/**
 * Installation lifecycle stages a customer sees, in order. The index in this
 * array is the stage's position in the timeline.
 */
export const PROJECT_STAGES = [
  "assessment",
  "proposal",
  "scheduled",
  "installed",
  "energized",
  "after_sales",
] as const
export type ProjectStage = (typeof PROJECT_STAGES)[number]

export const STAGE_LABEL: Record<ProjectStage, string> = {
  assessment: "Assessment",
  proposal: "Proposal",
  scheduled: "Scheduled",
  installed: "Installed",
  energized: "Energized",
  after_sales: "After-sales",
}

/** Short, customer-friendly description of what each stage means. */
export const STAGE_DESCRIPTION: Record<ProjectStage, string> = {
  assessment: "We're reviewing your site and energy use.",
  proposal: "We're preparing your system design and proposal.",
  scheduled: "Your installation is booked in.",
  installed: "Your system has been installed.",
  energized: "Your system is switched on and producing power.",
  after_sales: "Installation complete — we're here for ongoing support.",
}

/** Zero-based position of a stage in the timeline. */
export function stageIndex(stage: ProjectStage): number {
  return PROJECT_STAGES.indexOf(stage)
}

export function isProjectStage(value: unknown): value is ProjectStage {
  return (
    typeof value === "string" &&
    (PROJECT_STAGES as readonly string[]).includes(value)
  )
}

/** A document shared with the customer (proposal PDF, contract, warranty…). */
export type ProjectDocument = {
  id: string
  label: string
  url: string
  uploadedAt: string
}

/** Plain, client-safe project shape (ObjectId / Date serialized to strings). */
export type CustomerProject = {
  id: string
  customerUserId: string
  customerName: string
  customerEmail: string
  displayName: string
  siteAddress: string | null
  stage: ProjectStage
  stageNote: string | null
  stageUpdatedAt: string
  documents: ProjectDocument[]
  linkedLeadId: string | null
  createdAt: string
  updatedAt: string
}
