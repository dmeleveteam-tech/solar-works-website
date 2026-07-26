import "server-only"
import { ObjectId } from "mongodb"

import { notifyNewLead } from "./email-alerts"
import { SOURCE_LABEL, leadsCollection, type LeadDoc, type LeadSource } from "./leads"
import { dispatchLeadToN8n } from "./n8n"
import { notify } from "./notifications"

/**
 * The one place a lead is created, whatever channel it came from.
 *
 * This used to be inlined in `app/api/leads/route.ts`, which was fine while the
 * marketing site's form was the only caller. The chat brain (`lib/chat/brain.ts`)
 * now runs inside this app too, and having it POST back into its own
 * `/api/leads` would mean a self-directed HTTP round trip that has to guess its
 * own base URL — so the write moved down here and the route became auth +
 * validate + call. Everything downstream of the insert (in-app notification,
 * sales email, n8n dispatch) lives here as well, so no channel can accidentally
 * skip one.
 *
 * Callers are responsible for validation. The route validates with zod; the
 * brain validates the model's `save_lead` arguments against the canonical
 * vocabulary. This function trusts what it is handed.
 */

export type CreateLeadInput = {
  name: string
  email?: string | null
  phone?: string | null
  message?: string | null
  details?: Record<string, string> | null
  source: LeadSource
}

export async function createLead(input: CreateLeadInput): Promise<{ id: string }> {
  const details = input.details && Object.keys(input.details).length ? input.details : null

  const now = new Date()
  const doc: LeadDoc = {
    _id: new ObjectId(),
    name: input.name,
    email: input.email ? input.email : null,
    phone: input.phone ? input.phone : null,
    message: input.message ? input.message : null,
    source: input.source,
    status: "new",
    assignedToId: null,
    assignedToName: null,
    details,
    createdAt: now,
    updatedAt: now,
  }

  await leadsCollection().insertOne(doc)

  // Raise the in-app notification for the sales team. Awaited (it's one insert
  // on the connection we already hold) so it can't be cut short when the
  // serverless invocation ends; `notify` swallows its own failures.
  await notify({
    roles: ["staff", "superadmin"],
    type: "lead_new",
    title: `New lead — ${doc.name}`,
    body: `${SOURCE_LABEL[doc.source]} · ${doc.phone ?? doc.email ?? "no contact details"}`,
    href: "/dashboard",
  })

  // Fire-and-forget the sales alert; a notification failure must never affect
  // the captured lead or the response the marketing site sees.
  void notifyNewLead(doc)

  // Fire-and-forget the same lead into n8n for downstream automation. Same
  // contract: no-op when unconfigured, never affects the captured lead.
  void dispatchLeadToN8n(doc)

  return { id: doc._id.toString() }
}
