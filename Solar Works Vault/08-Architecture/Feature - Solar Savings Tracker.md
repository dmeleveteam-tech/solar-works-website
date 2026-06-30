---
title: Feature - Solar Savings Tracker
type: feature-spec
tags: [solar-works, platform, feature, savings, phase-2, postponed]
status: postponed
created: 2026-07-01
app: solarworks-platform
---

# Feature — Solar Savings Tracker

> [!abstract] Postponed (2026-07-01)
> **On hold — not started.** Build is parked until the client provides **two real monthly Deye exports** (needed to pin the parser) and confirms **what counts as "saved"** (all solar kWh produced × tariff, vs only self-consumed kWh × tariff). Decisions and MVP scope below are agreed and ready to resume from. Resume trigger: the 2 sample files arrive.

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
