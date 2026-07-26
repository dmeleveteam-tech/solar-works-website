import "server-only"

import { env, n8nDispatchEnabled } from "./env"
import { serializeLead, type LeadDoc } from "./leads"

/**
 * Outbound dispatch of captured leads to an n8n workflow.
 *
 * Every form + chatbot lead is POSTed to the configured n8n webhook so it can be
 * watched flowing through the canvas and fanned out downstream (Sheets, Slack,
 * etc.). This is a *downstream consumer* of the lead pipeline — the lead is
 * already persisted and the sales alert already sent before we get here; n8n is
 * purely additive automation.
 *
 * Design rules (same contract as lib/notifications.ts):
 * - Never throw. Lead capture must succeed even when n8n is down or misconfigured;
 *   failures are logged server-side only.
 * - No-op silently when unconfigured (deny-by-default off): set
 *   N8N_LEAD_WEBHOOK_URL to enable.
 * - We send the already-serialized `Lead` (stable JSON, no ObjectId/Date), which
 *   is exactly the shape the dashboard consumes.
 */

/**
 * Fire the lead into n8n. Fire-and-forget: callers should `void` this so it never
 * delays or fails the API response.
 */
export async function dispatchLeadToN8n(lead: LeadDoc): Promise<void> {
  if (!n8nDispatchEnabled || !env.N8N_LEAD_WEBHOOK_URL) return

  const headers: Record<string, string> = { "content-type": "application/json" }
  // Optional shared secret so the n8n webhook can reject unauthenticated posts
  // (configure a matching Header Auth credential on the n8n Webhook node).
  if (env.N8N_WEBHOOK_SECRET) headers["x-webhook-secret"] = env.N8N_WEBHOOK_SECRET

  try {
    const res = await fetch(env.N8N_LEAD_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(serializeLead(lead)),
      cache: "no-store",
    })
    if (!res.ok) {
      console.error(
        "n8n lead dispatch failed:",
        res.status,
        await res.text().catch(() => ""),
      )
    }
  } catch (err) {
    console.error("n8n lead dispatch error:", err)
  }
}
