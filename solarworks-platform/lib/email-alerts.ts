import "server-only"

import { env, leadsNotifyEnabled, projectEmailEnabled } from "./env"
import { escapeHtml } from "./html-escape"
import { siteFacts } from "./chat/site-facts"
import { SOURCE_LABEL, type LeadDoc } from "./leads"
import { type CustomerProject, type ProjectStage } from "./customer-projects-shared"
import { renderProjectStatusEmail } from "./email-templates/project-status"

/**
 * Outbound *email* alerts. Today this is just the new-lead sales alert (the
 * functional spec's minimum-required notification), delivered through Resend's
 * REST API so we don't pull an SDK into the bundle.
 *
 * Not to be confused with `./notifications`, the in-app notification feed
 * behind the header bell. The two are independent on purpose: email reaches the
 * sales team when nobody is signed in, the feed is what they see once they are.
 *
 * Design rules:
 * - Never throw. Lead capture must succeed even when email is misconfigured or
 *   Resend is down; failures are logged server-side only (NFR: don't leak
 *   internals to the client).
 * - No-op silently when notifications aren't configured (deny-by-default off).
 */

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

/**
 * Logo image for outbound emails. Deliberately points at the marketing site
 * (always a real public HTTPS deployment) rather than this app's own
 * APP_URL/BETTER_AUTH_URL, which is `http://localhost:*` in local dev and
 * therefore unreachable by an email client rendering the message.
 */
function logoUrl(): string {
  return `${env.MARKETING_SITE_URL.replace(/\/$/, "")}/images/solar-works-logo.png`
}

/** Where a customer without portal access can reach a human. */
function contactUrl(): string {
  return `${env.MARKETING_SITE_URL.replace(/\/$/, "")}/contact`
}

/** Deep link to the customer portal, this app's own — not the marketing site. */
function portalUrl(): string {
  const base = env.APP_URL ?? env.BETTER_AUTH_URL
  return `${base.replace(/\/$/, "")}/portal`
}

/** "email · phone" line shown under the CTA and in the footer, sourced from
 * `siteFacts` (the mirrored brand contact info) so it never drifts from the
 * marketing site or the chatbot's own answers. */
function supportLine(): string {
  return `${siteFacts.contact.email} · ${siteFacts.contact.phone}`
}

function formatSchedule(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  })
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

/** Outcome of a project-status email attempt, surfaced to the admin so a
 * silent Resend failure doesn't look like the customer was told. */
export type ProjectEmailResult = { sent: boolean; skippedReason?: string; error?: string }

/**
 * Tell a customer their project's status changed. Fired on every stage
 * transition (see `updateProjectStage` in `app/dashboard/projects/actions.ts`),
 * not just moves into "scheduled" — the schedule date/time is included in the
 * body when one is set. Same never-throw contract as `notifyNewLead`: a stage
 * update must succeed even when email is misconfigured or Resend is down: the
 * caller gets a result back instead of an exception, and decides how to warn
 * the admin.
 */
export async function notifyProjectStageChanged(
  project: CustomerProject,
  previousStage: ProjectStage,
): Promise<ProjectEmailResult> {
  if (!projectEmailEnabled) {
    return { sent: false, skippedReason: "Email notifications aren't configured." }
  }
  if (!project.customerEmail) {
    return { sent: false, skippedReason: "This customer has no email on file." }
  }

  const { subject, html } = renderProjectStatusEmail({
    project,
    previousStage,
    logoUrl: logoUrl(),
    contactUrl: contactUrl(),
    portalUrl: portalUrl(),
    supportLine: supportLine(),
    formattedScheduledAt: project.scheduledAt ? formatSchedule(project.scheduledAt) : null,
    formattedUpdatedAt: formatSchedule(project.stageUpdatedAt),
  })

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.LEADS_NOTIFY_FROM,
        to: [project.customerEmail],
        subject,
        html,
      }),
      cache: "no-store",
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error("Project status email failed:", res.status, text)
      return { sent: false, error: `Email provider returned ${res.status}.` }
    }
    return { sent: true }
  } catch (err) {
    console.error("Project status email error:", err)
    return { sent: false, error: "Network error while sending the email." }
  }
}
