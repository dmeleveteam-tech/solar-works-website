import { test } from "node:test"
import assert from "node:assert/strict"

import { PROJECT_STAGES, STAGE_LABEL, type CustomerProject, type ProjectStage } from "../customer-projects-shared"
import { STATUS_EMAIL_CONTENT, renderProjectStatusEmail } from "./project-status"

/**
 * Unit tests for the customer-facing "project status changed" email. No
 * database, no Resend key, no `server-only` import required — this module is
 * deliberately pure (see the file-level docstring), so what's asserted here
 * is exactly what a customer would see rendered in their inbox.
 */

function project(overrides: Partial<CustomerProject> = {}): CustomerProject {
  return {
    id: "proj-1",
    customerName: "Maria Santos",
    customerEmail: "maria@example.com",
    customerPhone: null,
    displayName: "Santos Residence — 6kW Hybrid",
    siteAddress: null,
    stage: "scheduled",
    stageNote: null,
    stageUpdatedAt: "2026-08-14T01:00:00.000Z",
    scheduledAt: "2026-08-20T01:00:00.000Z",
    documents: [],
    linkedLeadId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-08-14T01:00:00.000Z",
    ...overrides,
  }
}

const baseInput = {
  logoUrl: "https://solar-works-website.vercel.app/images/solar-works-logo.png",
  contactUrl: "https://solar-works-website.vercel.app/contact",
  portalUrl: "https://platform.example.com/portal",
  supportLine: "hello@solarworks.ph · +63 917 555 0142",
  formattedUpdatedAt: "August 14, 2026 at 9:00 AM",
}

// --- config completeness -----------------------------------------------------

test("STATUS_EMAIL_CONTENT has an entry for every project stage", () => {
  for (const stage of PROJECT_STAGES) {
    const content = STATUS_EMAIL_CONTENT[stage]
    assert.ok(content, `missing STATUS_EMAIL_CONTENT entry for "${stage}"`)
    assert.equal(typeof content.subjectLabel, "string")
    assert.ok(content.subjectLabel.length > 0)
    assert.equal(typeof content.headline, "string")
    assert.ok(content.headline.length > 0)
    assert.equal(typeof content.whatThisMeans, "string")
    assert.ok(content.whatThisMeans.length > 20, `explanation for "${stage}" looks too short to be useful`)
  }
})

// --- subject line -------------------------------------------------------------

test("subject follows 'Your Solar Project Update: <status>'", () => {
  const { subject } = renderProjectStatusEmail({
    ...baseInput,
    project: project({ stage: "scheduled" }),
    previousStage: "proposal",
    formattedScheduledAt: "August 20, 2026 at 9:00 AM",
  })
  assert.equal(subject, "Your Solar Project Update: Scheduled")
})

test("subject uses the stage's configured subjectLabel, not the timeline pill label", () => {
  const { subject } = renderProjectStatusEmail({
    ...baseInput,
    project: project({ stage: "installed" }),
    previousStage: "scheduled",
    formattedScheduledAt: null,
  })
  // STAGE_LABEL.installed is "Installed", but the subject should read the
  // richer, email-specific copy from STATUS_EMAIL_CONTENT instead.
  assert.equal(subject, "Your Solar Project Update: Installation Complete")
  assert.notEqual(subject, `Your Solar Project Update: ${STAGE_LABEL.installed}`)
})

// --- dynamic field rendering ---------------------------------------------------

test("renders the customer name, project name, and both status labels", () => {
  const { html } = renderProjectStatusEmail({
    ...baseInput,
    project: project({
      customerName: "Juan Dela Cruz",
      displayName: "Dela Cruz Home Solar",
      stage: "energized",
    }),
    previousStage: "installed",
    formattedScheduledAt: null,
  })
  assert.match(html, /Hi Juan Dela Cruz,/)
  assert.match(html, /Dela Cruz Home Solar/)
  assert.match(html, />\s*Installed\s*</) // previous status
  assert.match(html, />\s*Energized\s*</) // new status pill
  assert.match(html, new RegExp(STATUS_EMAIL_CONTENT.energized.whatThisMeans.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
})

test("falls back to a generic greeting when the customer has no name on file", () => {
  const { html } = renderProjectStatusEmail({
    ...baseInput,
    project: project({ customerName: "" }),
    previousStage: "proposal",
    formattedScheduledAt: "August 20, 2026 at 9:00 AM",
  })
  assert.match(html, /Hi there,/)
})

// --- escaping (no unescaped customer input reaches the HTML) -------------------

test("escapes HTML-significant characters in customer-controlled fields", () => {
  const { html } = renderProjectStatusEmail({
    ...baseInput,
    project: project({
      customerName: `Anna <script>alert(1)</script> & "Co"`,
      displayName: `O'Brien's <b>Project</b>`,
      stage: "proposal",
      stageNote: `<img src=x onerror=alert(1)>`,
    }),
    previousStage: "assessment",
    formattedScheduledAt: null,
  })
  assert.ok(!html.includes("<script>"), "raw <script> tag leaked into the email HTML")
  assert.ok(!html.includes("<b>Project</b>"), "raw <b> tag from the project name leaked into the email HTML")
  assert.ok(!html.includes("<img src=x onerror=alert(1)>"), "raw <img onerror> leaked into the email HTML")
  assert.match(html, /Anna &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;Co&quot;/)
  assert.match(html, /O&#39;Brien&#39;s &lt;b&gt;Project&lt;\/b&gt;/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
})

// --- conditional blocks ---------------------------------------------------------

test("includes the installation-date row only when the stage is scheduled with a date", () => {
  const withDate = renderProjectStatusEmail({
    ...baseInput,
    project: project({ stage: "scheduled" }),
    previousStage: "proposal",
    formattedScheduledAt: "August 20, 2026 at 9:00 AM",
  }).html
  assert.match(withDate, /Installation date/)
  assert.match(withDate, /August 20, 2026 at 9:00 AM/)

  const notScheduled = renderProjectStatusEmail({
    ...baseInput,
    project: project({ stage: "installed" }),
    previousStage: "scheduled",
    formattedScheduledAt: null,
  }).html
  assert.ok(!notScheduled.includes("Installation date"))
})

test("includes the staff note only when one is set", () => {
  const withNote = renderProjectStatusEmail({
    ...baseInput,
    project: project({ stageNote: "Please clear the roof access before our crew arrives." }),
    previousStage: "proposal",
    formattedScheduledAt: "August 20, 2026 at 9:00 AM",
  }).html
  assert.match(withNote, /Note from our team/)
  assert.match(withNote, /Please clear the roof access before our crew arrives\./)

  const withoutNote = renderProjectStatusEmail({
    ...baseInput,
    project: project({ stageNote: null }),
    previousStage: "proposal",
    formattedScheduledAt: "August 20, 2026 at 9:00 AM",
  }).html
  assert.ok(!withoutNote.includes("Note from our team"))
})

// --- links -----------------------------------------------------------------------

test("wires the portal and contact links through, and shows the support line", () => {
  const { html } = renderProjectStatusEmail({
    ...baseInput,
    project: project(),
    previousStage: "proposal",
    formattedScheduledAt: "August 20, 2026 at 9:00 AM",
  })
  assert.match(html, /href="https:\/\/platform\.example\.com\/portal"/)
  assert.match(html, /href="https:\/\/solar-works-website\.vercel\.app\/contact"/)
  assert.match(html, /hello@solarworks\.ph · \+63 917 555 0142/)
})

// --- sanity: every stage renders without throwing -------------------------------

test("every project stage renders a complete, non-empty email", () => {
  for (const stage of PROJECT_STAGES as readonly ProjectStage[]) {
    const { subject, html } = renderProjectStatusEmail({
      ...baseInput,
      project: project({ stage }),
      previousStage: "assessment",
      formattedScheduledAt: stage === "scheduled" ? "August 20, 2026 at 9:00 AM" : null,
    })
    assert.ok(subject.startsWith("Your Solar Project Update: "))
    assert.ok(html.includes("Santos Residence"))
  }
})
