---
title: Feature - Solar Savings Tracker
type: feature-spec
tags: [solar-works, platform, feature, savings, phase-2, postponed]
status: postponed
created: 2026-07-01
app: solarworks-platform
---

# Feature — Solar Savings Tracker

> [!abstract] Scaffolding built (2026-07-01) — parser still blocked
> The parts that do **not** depend on the real Deye file format are now **built and committed** on branch `phase-1-launch-qa`: the tariff table, the customer↔plant links, the savings-email consent toggle, the monthly-readings data layer, and the pure savings maths (all unit-tested). What remains blocked is the **file parser** — it stays an explicit stub until the client provides **two real monthly Deye exports** — and the **"what counts as saved"** decision (all solar kWh produced × tariff, vs only self-consumed kWh × tariff), which the app currently defaults to *all production* and labels provisional in the UI. Resume trigger: the 2 sample files + the basis decision arrive; then implement the parser and flip `PARSER_CONFIGURED`.

## Build status (2026-07-01)

Done (committed):
- Tariff table — admin-maintained flat ₱/kWh per provider (`lib/savings.ts`, staff screen at `/dashboard/savings`).
- Plant links — connect a customer account to their Deye plant + provider, reusing the customer-projects create-existing/create-new-customer flow; per-plant email-consent toggle.
- Monthly readings — data layer with `(plant, month)` upsert (`saveReadingsForPlant`).
- Savings maths — pure `computeMonthlySavings`, `billableKwh`, `monthOverMonthDelta` in `lib/savings-shared.ts`, covered by `lib/savings.test.ts` (15 tests).
- Upload flow wired end-to-end but disabled behind `PARSER_CONFIGURED = false`.
- `savings` permission resource; deletes are superadmin-only; every action re-checks role server-side.

Still to do when unblocked:
- Implement `parseDeyeExport` in `lib/savings-parser.ts` from the 2 sample files; flip `PARSER_CONFIGURED`; add fixture tests.
- Confirm the "saved" basis and set `DEFAULT_SAVINGS_BASIS` accordingly.
- Customer-facing comparison view in the portal + the staff-triggered, consent-gated Resend email.

> [!warning] Not in the Functional Specifications
> This feature is **not** in [[Solar Works - Website Production Build Guide|Functional Spec v1.0]] or the website vault. The spec deliberately puts a *"customer portal / monitoring dashboard"* **out of scope** for Phase 1 ([[Project Scope]] §1.2) and forbids unverified savings claims on the **public** site ([[Page - Customer Stories|T-05]]). This is a **new Phase-2 feature of the authenticated app**, not website work.

## What it does

For an existing Solar Works customer, ingest their **Deye** monthly generation data, compute how much energy and money their solar system saved, show a **month-to-month comparison** inside the app, and let staff **email the customer** their savings summary.

## Locked decisions (2026-07-01)

| Decision | Choice |
|---|---|
| Codebase | **`solarworks-platform`** (authenticated app) — lives behind login, in the customer-portal / staff phase. Not on the marketing site. |
| Data source (MVP) | **Manual upload** of the 2 monthly exports (CSV/XLSX) downloaded from the Deye / Solarman portal. App parses + stores them. |
| Savings calculation | **Solar kWh produced × the customer's own utility tariff** (per-provider rate: Meralco / BATELEC / VECO / Davao Light / etc.). |

## Why this is allowed despite T-05

T-05 bans **projected / unverified savings shown as guarantees to prospects** on the public site. This feature shows an **existing customer their own real, measured generation data**, with consent, inside a private logged-in area. Different audience, real data — legitimate. Carry-over guardrails still apply:
- Label every peso figure an **estimate** and show the assumptions (tariff used, period).
- It is **personal data + outbound email** → consent + Privacy Notice ([[Non-Functional Requirements|NFR-03]]) apply.

## MVP scope (proposed)

1. **Customer record** — link a Deye plant/site to an existing customer in the app.
2. **Upload + parse** — staff upload two monthly Deye exports; parser extracts kWh produced per month (+ self-consumption / export if present). Store raw file + parsed rows; show parse preview before commit.
3. **Tariff table** — small editable per-utility-provider ₱/kWh table (admin-maintained). Each customer is tagged with their provider.
4. **Savings calc** — `savings = kWh_produced × tariff(provider)` per month; compute month-over-month delta (kWh and ₱).
5. **Comparison view** — in-app screen: month A vs month B, kWh produced, estimated ₱ saved, delta, simple chart.
6. **Customer email** — staff-triggered email (via existing **Resend** setup) with the savings summary; clearly marked estimate; customer consent recorded before first send.

## Open questions (resolve before build)

- [ ] **Deye export format** — get 2 real sample files to pin the parser (column names, units, date format, CSV vs XLSX).
- [ ] **"Saved" definition** — total solar production × tariff, or only self-consumed kWh × tariff (excluding exported/net-metered energy)? These give very different numbers.
- [ ] **Net metering** — does Solar Works' customer base export to grid? If so, export credits need separate handling.
- [ ] **Tariff granularity** — flat ₱/kWh per provider, or tiered/time-of-use? Start flat, editable.
- [ ] **Email cadence** — one-off staff send vs recurring monthly. MVP = manual staff trigger.
- [ ] **Consent capture** — where/when the customer agrees to receive savings emails (ties to [[Page - Privacy Notice and Terms]]).
- [ ] **Phase-2 automation** — later, replace manual upload with **Deye Cloud / Solarman API** pull (noted, not in MVP).

## Related

- [[Tech Stack and Architecture]] — reuses MongoDB + Resend; new parser + tariff/savings modules.
- [[Project Scope]] — records the original Phase-1 exclusion this extends.
- [[Non-Functional Requirements]] — privacy/consent (NFR-03), security (NFR-02).
