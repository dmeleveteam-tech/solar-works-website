/**
 * Reusable HTML template for the "your project's status changed" customer
 * email, sent by `notifyProjectStageChanged` in `../email-alerts.ts` on every
 * stage transition (see `updateProjectStage` in
 * `app/dashboard/projects/actions.ts`).
 *
 * Deliberately has NO `server-only` import and no `env`/Resend dependency —
 * same rule as `customer-projects-shared.ts` — so the rendering itself stays
 * unit-testable (`./project-status.test.ts`) without a database or API key.
 * Anything that needs the environment (logo URL, portal/contact links,
 * timezone-formatted dates) is computed by the caller and passed in.
 *
 * Per-status copy lives in STATUS_EMAIL_CONTENT below, one entry per
 * `ProjectStage`. Edit that object to change wording — it's the only place
 * status-specific copy is allowed to live, so the markup below never needs to
 * change when copy does.
 */
import { escapeHtml } from "../html-escape"
import { PROJECT_STAGES, STAGE_LABEL, type CustomerProject, type ProjectStage } from "../customer-projects-shared"

export type StatusEmailContent = {
  /** Short label used in the subject line, e.g. "Your Solar Project Update: {subjectLabel}". */
  subjectLabel: string
  /** Completes "Good news — {project name} …", e.g. "has been scheduled for installation." */
  headline: string
  /** 1–2 plain-language sentences: what this status means and/or what happens next. */
  whatThisMeans: string
}

export const STATUS_EMAIL_CONTENT: Record<ProjectStage, StatusEmailContent> = {
  assessment: {
    subjectLabel: "Assessment",
    headline: "is now in the assessment stage.",
    whatThisMeans:
      "Our team is reviewing your site details and energy usage to design the right system for your home. We'll follow up as soon as your proposal is ready.",
  },
  proposal: {
    subjectLabel: "Proposal Ready",
    headline: "has a proposal ready for you.",
    whatThisMeans:
      "We've put together a system design and quote based on your assessment. A member of our team will reach out shortly to walk you through the details.",
  },
  scheduled: {
    subjectLabel: "Scheduled",
    headline: "has been scheduled for installation.",
    whatThisMeans:
      "Your installation date is booked in — you'll find it below. Please make sure your roof and installation area are clear and accessible on that day.",
  },
  installed: {
    subjectLabel: "Installation Complete",
    headline: "has been installed.",
    whatThisMeans:
      "Our crew has finished the physical installation at your site. Next, we'll inspect the system and connect it to the grid before switching it on.",
  },
  energized: {
    subjectLabel: "System Energized",
    headline: "is now switched on and producing power.",
    whatThisMeans:
      "Congratulations — your solar system is energized and generating power. You can start enjoying the savings right away.",
  },
  after_sales: {
    subjectLabel: "Project Complete",
    headline: "is now complete.",
    whatThisMeans:
      "Your installation is fully complete, and your project has moved into after-sales support. If you ever need maintenance or warranty help, our team is just a message away.",
  },
}

// Fail loudly in dev/CI if a stage is ever added without matching email copy —
// better than silently sending a customer email with an undefined explanation.
for (const stage of PROJECT_STAGES) {
  if (!STATUS_EMAIL_CONTENT[stage]) {
    throw new Error(`STATUS_EMAIL_CONTENT is missing an entry for project stage "${stage}"`)
  }
}

export type ProjectStatusEmailInput = {
  project: CustomerProject
  previousStage: ProjectStage
  /** Absolute HTTPS URL to the brand logo image. */
  logoUrl: string
  /** Where the customer can reach a human — there is no customer portal/login. */
  contactUrl: string
  /** Support contact line shown under the CTA, e.g. "hello@solarworks.ph · +63 917 555 0142". */
  supportLine: string
  /** Pre-formatted (Asia/Manila) installation date/time; omit when the stage isn't "scheduled" or no date is set. */
  formattedScheduledAt: string | null
  /** Pre-formatted (Asia/Manila) "last updated" timestamp. */
  formattedUpdatedAt: string
}

/** Renders the subject + HTML body for a project stage-change email. */
export function renderProjectStatusEmail(input: ProjectStatusEmailInput): {
  subject: string
  html: string
} {
  const { project, previousStage, logoUrl, contactUrl, supportLine, formattedScheduledAt, formattedUpdatedAt } = input

  const content = STATUS_EMAIL_CONTENT[project.stage]
  const newLabel = STAGE_LABEL[project.stage]
  const prevLabel = STAGE_LABEL[previousStage]
  const customerName = escapeHtml(project.customerName || "there")
  const projectName = escapeHtml(project.displayName)

  const subject = `Your Solar Project Update: ${content.subjectLabel}`

  const scheduleRow =
    project.stage === "scheduled" && formattedScheduledAt
      ? `<tr>
           <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;width:140px;vertical-align:top">
             Installation date
           </td>
           <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600">
             ${escapeHtml(formattedScheduledAt)}
           </td>
         </tr>`
      : ""

  const noteBlock = project.stageNote
    ? `<div style="margin:20px 0 0;padding:14px 16px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:8px;font-size:14px;color:#374151;line-height:1.6">
         <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280">Note from our team</p>
         ${escapeHtml(project.stageNote)}
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
            Project status update
          </p>
        </div>

        <!-- Body -->
        <div class="sw-px" style="padding:32px">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#111827">Hi ${customerName},</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6">
            Good news — <strong>${projectName}</strong> ${content.headline}
          </p>

          <table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 8px">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;width:140px;vertical-align:top">
                Previous status
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827">
                ${escapeHtml(prevLabel)}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;vertical-align:top">
                New status
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827">
                <span style="display:inline-block;background:#fef3c7;color:#92400e;font-weight:600;padding:2px 10px;border-radius:999px;font-size:13px">
                  ${escapeHtml(newLabel)}
                </span>
              </td>
            </tr>
            ${scheduleRow}
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#6b7280;vertical-align:top">Updated</td>
              <td style="padding:10px 0;font-size:14px;color:#111827">${escapeHtml(formattedUpdatedAt)}</td>
            </tr>
          </table>

          <div style="margin:20px 0 0;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e">What this means</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${content.whatThisMeans}</p>
          </div>

          ${noteBlock}

          <div style="text-align:center;margin:28px 0 4px">
            <a href="${contactUrl}" style="display:inline-block;background:#f59e0b;color:#111827;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
              Contact us
            </a>
            <p style="margin:14px 0 0;font-size:12px;color:#9ca3af">
              Questions about ${projectName}? Reach us at ${supportLine}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:20px 32px;background:#fafafa;border-top:1px solid #e5e7eb;text-align:center">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151">Solar Works Energy Solutions</p>
          <p style="margin:0 0 10px;font-size:12px;color:#9ca3af">Serving Batangas · Laguna · Cavite · Metro Manila · Quezon</p>
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">
            This is an automated update about your solar project. You're receiving it because it's the
            contact email on file for this project. Questions? Reply to this email or reach us at ${supportLine}.
          </p>
        </div>
      </div>
    </div>`

  return { subject, html }
}
