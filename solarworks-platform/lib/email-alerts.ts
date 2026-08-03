import "server-only"

import { env, leadsNotifyEnabled, projectEmailEnabled } from "./env"
import { siteFacts } from "./chat/site-facts"
import { SOURCE_LABEL, type LeadDoc } from "./leads"
import { type CustomerProject, type ProjectStage } from "./customer-projects-shared"
import { renderProjectStatusEmail } from "./email-templates/project-status"
import { renderLeadNotificationEmail } from "./email-templates/lead-notification"

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * POST to Resend's send endpoint, retrying a couple of times on transient
 * network failures (e.g. the TLS connection getting reset mid-handshake —
 * observed in practice between Vercel functions and api.resend.com). A single
 * dropped connection used to mean a silently lost sales alert or customer
 * email, since callers only fire this once and never see the failure.
 *
 * Does NOT retry a response Resend itself returned (4xx/5xx) — those are
 * real rejections (bad payload, unverified sender domain, etc.) that a retry
 * cannot fix, so we fail fast and let the caller report the exact status.
 */
async function postToResend(
  body: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxAttempts = 3
  let lastError = "Network error while sending the email."

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      })
      if (res.ok) return { ok: true }
      const text = await res.text().catch(() => "")
      console.error("Resend send failed:", res.status, text)
      return { ok: false, error: `Email provider returned ${res.status}.` }
    } catch (err) {
      console.error(`Resend send network error (attempt ${attempt}/${maxAttempts}):`, err)
      lastError = "Network error while sending the email."
      if (attempt < maxAttempts) await sleep(attempt * 300)
    }
  }
  return { ok: false, error: lastError }
}

/**
 * Send the sales team an email about a freshly-captured lead. Fire-and-forget:
 * callers should `void` this so it never delays or fails the API response.
 */
export async function notifyNewLead(lead: LeadDoc): Promise<void> {
  if (!leadsNotifyEnabled) return

  const to = recipients()
  if (to.length === 0) return

  const { subject, html } = renderLeadNotificationEmail({
    refId: lead.refId ?? null,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    details: lead.details ?? {},
    sourceLabel: SOURCE_LABEL[lead.source],
    logoUrl: logoUrl(),
    dashboardUrl: dashboardUrl(),
  })

  const result = await postToResend({ from: env.LEADS_NOTIFY_FROM, to, subject, html })
  if (!result.ok) console.error("Lead notification failed:", result.error)
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

  const result = await postToResend({
    from: env.LEADS_NOTIFY_FROM,
    to: [project.customerEmail],
    subject,
    html,
  })
  if (!result.ok) {
    console.error("Project status email failed:", result.error)
    return { sent: false, error: result.error }
  }
  return { sent: true }
}
