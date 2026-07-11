/**
 * Client-safe lead constants and types. This module deliberately has NO
 * `server-only` or mongodb import, so Client Components (e.g. the leads inbox
 * UI) can import the enums, labels, and serialized `Lead` shape without pulling
 * the database driver into the browser bundle. Server-only data access lives in
 * `./leads`, which re-exports everything here for convenience.
 */

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_SOURCES = ["website_form", "chatbot", "manual"] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
}

// Channel labels exactly as the spec's Leads database defines them
// ("Website Form" / "Website Chatbot"); QA-03 checks the chatbot wording.
export const SOURCE_LABEL: Record<LeadSource, string> = {
  website_form: "Website Form",
  chatbot: "Website Chatbot",
  manual: "Manual",
}

/**
 * Extra, free-form fields captured by the marketing-site form (address,
 * property type, goals, etc.) that don't warrant their own column. Stored as
 * labelled string pairs so the inbox can show them without a schema migration.
 */
export type LeadDetails = Record<string, string>

/** Plain, client-safe shape (ObjectId / Date serialized to strings). */
export type Lead = {
  id: string
  name: string
  email: string | null
  phone: string | null
  message: string | null
  source: LeadSource
  status: LeadStatus
  assignedToId: string | null
  assignedToName: string | null
  details: LeadDetails | null
  createdAt: string
  updatedAt: string
}
