import "server-only"

import { env, leadsNotifyEnabled } from "./env"
import { SOURCE_LABEL, type LeadDoc } from "./leads"

/**
 * Outbound notifications. Today this is just the new-lead sales alert (the
 * functional spec's minimum-required notification), delivered through Resend's
 * REST API so we don't pull an SDK into the bundle.
 *
 * Design rules:
 * - Never throw. Lead capture must succeed even when email is misconfigured or
 *   Resend is down; failures are logged server-side only (NFR: don't leak
 *   internals to the client).
 * - No-op silently when notifications aren't configured (deny-by-default off).
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Split the comma-separated recipient list, dropping blanks. */
function recipients(): string[] {
  return (env.LEADS_NOTIFY_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function dashboardUrl(): string {
  const base = env.APP_URL ?? env.BETTER_AUTH_URL
  return `${base.replace(/\/$/, "")}/dashboard`
}

function renderRows(lead: LeadDoc): string {
  const rows: Array<[string, string]> = [
    ["Name", lead.name],
    ["Mobile", lead.phone ?? "—"],
    ["Email", lead.email ?? "—"],
    ["Source", SOURCE_LABEL[lead.source]],
  ]
  if (lead.message) rows.push(["Notes", lead.message])
  for (const [label, value] of Object.entries(lead.details ?? {})) {
    rows.push([label, value])
  }
  return rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(
          label,
        )}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`,
    )
    .join("")
}

/**
 * Send the sales team an email about a freshly-captured lead. Fire-and-forget:
 * callers should `void` this so it never delays or fails the API response.
 */
export async function notifyNewLead(lead: LeadDoc): Promise<void> {
  if (!leadsNotifyEnabled) return

  const to = recipients()
  if (to.length === 0) return

  const subject = `New ${SOURCE_LABEL[lead.source].toLowerCase()} lead — ${lead.name}`
  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#111">
      <h2 style="margin:0 0 12px">New lead captured</h2>
      <table style="border-collapse:collapse">${renderRows(lead)}</table>
      <p style="margin:20px 0 0">
        <a href="${dashboardUrl()}" style="color:#1d4ed8">Open the leads dashboard →</a>
      </p>
    </div>`

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.LEADS_NOTIFY_FROM,
        to,
        subject,
        html,
      }),
      cache: "no-store",
    })
    if (!res.ok) {
      console.error(
        "Lead notification failed:",
        res.status,
        await res.text().catch(() => ""),
      )
    }
  } catch (err) {
    console.error("Lead notification error:", err)
  }
}
