---
title: Feature - Customer Portal
type: architecture
tags: [solar-works, platform, customer-portal, phase-2a, spec]
created: 2026-07-01
status: built
scope_confirmed: 2026-07-01
built: 2026-07-01
---

# Feature - Customer Portal (Phase 2a)

> [!success] Status: scope confirmed 2026-07-01 — building the thin-slice MVP
> Confirmed decisions:
> 1. Account linking — **staff create/invite the customer account and explicitly link it** to a project (option a). No customer self-signup in the MVP.
> 2. MVP size — **thin slice: project status/timeline + documents only.** Quotes and profile self-edits are deferred.
> 3. Quotes/proposals — shown as an **attached document** (no structured in-app figures yet); covered by the documents area.
>
> Phase 1 deliberately left the customer dashboard out (out-of-scope in the
> functional spec, §1), so this is genuinely new work.

## Audience and goal

A **logged-in customer** of Solar Works signs in to `/portal` and sees **only their
own** information: where their solar assessment stands, the quote(s) the team has
prepared for them, how their installation is progressing, and any documents shared
with them. Staff and admins manage that information from the back-office; a customer
can never see another customer's records.

This lives entirely in `solarworks-platform` (the authenticated app), reuses the
existing `customer` role, and re-checks ownership on the server for every read and
action (deny by default). It is separate from the public marketing site.

## Where it fits today

- `/portal` already exists as a placeholder, gated by `requireRole("customer", "superadmin")`.
- The `customer` role exists with no admin-plugin permissions ([[App backend architecture]]).
- Leads already exist (`leads` collection) but are **not linked** to a customer
  account — they are captured anonymously from the marketing site. Establishing
  that link is the core new design decision (see Open decisions).

## Proposed MVP scope

A customer-facing **project record** is the heart of the portal: one record per
customer engagement, created and maintained by staff, that the customer can view.

1. **Project status / timeline** — a small set of stages (e.g. Assessment →
   Proposal → Scheduled → Installed → Energized → After-sales) with the current
   stage and a short note. Read-only for the customer.
2. **Quotes** — one or more proposal entries (headline figures + an attached
   document/link), always labelled estimates, shown read-only to the customer.
3. **Documents** — files staff share (proposal PDF, contract, warranty), uploaded
   via the existing UploadThing setup, downloadable by the owning customer only.
4. **Profile basics** — the customer sees their name/email and a contact CTA
   (Viber/phone) to reach their adviser; no self-service edits in the MVP.

Staff/admin side (back-office):
- Create a customer project and link it to a customer account.
- Update the stage, add quotes, upload documents.
- Optionally convert an existing won lead into a customer project (carrying over
  name/contact/details), if we adopt the lead-link option below.

Out of MVP (later phases): in-portal messaging/chat, payments/invoicing, live
monitoring/telemetry, self-service profile edits, the [[Feature - Solar Savings Tracker]]
(its own Phase 2b note).

## Data model (proposed)

New `customerProjects` collection (shapes TBD on confirmation), each document owned
by exactly one `customerUserId`:

- `customerUserId` (links to the better-auth `user._id`)
- `displayName`, `siteAddress`
- `stage` (enum) + `stageNote`, `stageUpdatedAt`
- `quotes: [{ label, systemSummary, estPricePhp, estMonthlySavingsPhp?, documentUrl?, createdAt }]`
- `documents: [{ label, url, uploadedAt }]`
- `linkedLeadId?` (if created from a won lead)
- timestamps

Every portal query is scoped `{ customerUserId: session.user.id }`; staff/admin
queries are role-gated. New permission statements (e.g. `project: [read, manage]`)
added to [[App backend architecture|permissions]], with `customer` granted read of
its own only.

## Definition of done (from the goal)

- A customer logs in and sees only their own records; another customer's records
  are never returned (verified by an ownership-scoping test).
- Staff/admin can create and manage those records.
- This spec note is confirmed, and tests exist for the ownership boundary and the
  staff management actions.

## Implemented (2026-07-01)

Built as confirmed and verified (typecheck/lint/build/test clean; DB ownership
isolation, authenticated render, and account provisioning all checked):

- `customerProjects` collection + owner-scoped data layer (`lib/customer-projects.ts`);
  the ownership scope and stage model are isolated in pure modules
  (`customer-projects-access`, `customer-projects-shared`) and unit-tested
  (`pnpm test`, 6 tests).
- Staff manage at `/dashboard/projects`: create a project linked to an existing
  or newly-provisioned customer account, set stage + note, upload/remove
  documents, delete (superadmin only). New customer accounts are created via a
  standalone better-auth instance so provisioning never signs the staff member
  out. Document uploads use a staff-gated UploadThing `customerDocument` endpoint.
- Customers see `/portal`: a read-only stage timeline + downloadable documents,
  scoped to their own records, with an empty state until a project exists.
- `project` permission statements added; staff/superadmin manage, customer reads
  own (enforced by query scope, not the role statement).

What stayed deferred (as agreed): customer self-signup, structured in-app quote
figures, profile self-edits, messaging, payments, monitoring.

## Open decisions (resolved 2026-07-01)

All three were confirmed at the top of this note. Kept for the record:

1. **How does a customer account get linked to their data?**
   - (a) Staff create/invite the customer account and explicitly link it to a
     project (most control, recommended).
   - (b) Customer self-signs-up (email/Google) and staff link them by matching
     email to a won lead.
   - (c) Both.
2. **MVP scope size** — all four areas above, or a thinner first slice (e.g.
   status + documents only, quotes later)?
3. **Quotes** — structured figures in the app, or just an attached proposal
   document for now?

## Related

- [[App backend architecture]]
- [[Feature - Solar Savings Tracker]] (Phase 2b)
- [[Admin Handover and Go-Live Guide]]
- [[User Flows and Swimlanes]]
