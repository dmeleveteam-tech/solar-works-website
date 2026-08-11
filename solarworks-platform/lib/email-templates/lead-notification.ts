/**
 * Reusable HTML template for the "new lead captured" sales-team email, sent by
 * `notifyNewLead` in `../email-alerts.ts` whenever a fresh enquiry comes in
 * from the marketing site's contact form, the chatbot, or manual entry.
 *
 * Deliberately has NO `server-only` import and no `env`/Resend/mongodb
 * dependency — same rule as `./project-status.ts` — so the rendering itself
 * stays unit-testable without a database or API key. Anything that needs the
 * environment (logo URL, dashboard link) is computed by the caller and passed
 * in, and the lead itself is passed as plain fields rather than the full
 * `LeadDoc` so this file never needs the mongodb types.
 */
import { escapeHtml } from "../html-escape"

export type LeadNotificationEmailInput = {
  refId: string | null
  name: string
  email: string | null
  phone: string | null
  message: string | null
  /** Extra source-specific fields (e.g. chatbot slot answers), label → value. */
  details: Record<string, string>
  /** Human-readable source, e.g. "Contact form". */
  sourceLabel: string
  /** Absolute HTTPS URL to the brand logo image. */
  logoUrl: string
  /** Deep link to the leads dashboard, shown as the primary call-to-action. */
  dashboardUrl: string
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;width:140px;vertical-align:top">
      ${escapeHtml(label)}
    </td>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827">
      ${escapeHtml(value)}
    </td>
  </tr>`
}

/** Renders the subject + HTML body for a new-lead sales-team alert. */
export function renderLeadNotificationEmail(input: LeadNotificationEmailInput): {
  subject: string
  html: string
} {
  const { refId, name, email, phone, message, details, sourceLabel, logoUrl, dashboardUrl } = input

  const subject = `New ${sourceLabel.toLowerCase()} lead — ${name}`

  const rows = [
    row("Lead ID", refId ?? "—"),
    row("Name", name),
    row("Mobile", phone ?? "—"),
    row("Email", email ?? "—"),
    row("Source", sourceLabel),
    ...Object.entries(details).map(([label, value]) => row(label, value)),
  ].join("")

  const messageBlock = message
    ? `<div style="margin:20px 0 0;padding:14px 16px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:8px;font-size:14px;color:#374151;line-height:1.6">
         <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280">Message</p>
         ${escapeHtml(message)}
       </div>`
    : ""

  const html = `
    <style>
      @media only screen and (max-width:600px) {
        .sw-card { width:100% !important; border-radius:0 !important; }
        .sw-px { padding-left:20px !important; padding-right:20px !important; }
      }
    </style>
    <div style="background:#f4f4f5;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
      <div class="sw-card" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">

        <!-- Header -->
        <div style="padding:28px 32px;text-align:center;background:linear-gradient(135deg,#fbbf24,#d97706)">
          <img src="${logoUrl}" alt="SolarWorks" height="34" style="height:34px;width:auto;display:inline-block" />
          <p style="margin:8px 0 0;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fffbeb">
            New lead captured
          </p>
        </div>

        <!-- Body -->
        <div class="sw-px" style="padding:32px">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#111827">${escapeHtml(name)}</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6">
            A new <strong>${escapeHtml(sourceLabel.toLowerCase())}</strong> enquiry just came in — details below.
          </p>

          <table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 8px">
            ${rows}
          </table>

          ${messageBlock}

          <div style="text-align:center;margin:28px 0 4px">
            <a href="${dashboardUrl}" style="display:inline-block;background:#f59e0b;color:#111827;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
              Open the leads dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:20px 32px;background:#fafafa;border-top:1px solid #e5e7eb;text-align:center">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151">Solar Works Energy Solutions</p>
          <p style="margin:0;font-size:12px;color:#9ca3af">Serving Batangas · Laguna · Cavite · Metro Manila · Quezon</p>
        </div>
      </div>
    </div>`

  return { subject, html }
}
