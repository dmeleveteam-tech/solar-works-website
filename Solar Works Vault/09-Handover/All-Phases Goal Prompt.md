---
title: All-Phases Goal Prompt
type: handover
tags: [solar-works, goal, prompt, automation]
created: 2026-07-01
status: ready
---

# All-Phases Goal Prompt

A self-contained prompt for the Claude Code **goal feature** to drive the whole program from "code-complete" to "fully launched, all phases done." Written to stand alone (the goal feature may start a fresh agent without prior chat context). It encodes the current state, the project's working rules, the phased plan with acceptance criteria, and the items that must be requested from the human rather than fabricated.

> [!note] Before running
> Decide whether the agent may push branches / open PRs / deploy on its own. As written it must NOT — it pauses for approval. Loosen the relevant lines if you want more autonomy. Phase 2b stays blocked until the two Deye export files are supplied.

## Prompt

```
GOAL: Take the Solar Works project from "code-complete" to "fully launched, all phases done."

REPO: C:\dev-proj\projects-work\Solar-Works-Website  (git branch: main; GitHub: dmeleveteam-tech/solar-works-website)
This repo contains TWO Next.js apps plus an Obsidian vault:
  - solarworks-landingpage/  = public marketing website (visitors)
  - solarworks-platform/     = authenticated back-office app (staff/admin/customer): logins, leads inbox, CMS
  - Solar Works Vault/        = human-readable project notes (source of truth for decisions)
Stack: Next.js 16 (React 19) · MongoDB Atlas · better-auth · shadcn/ui · Groq (chatbot) · Resend (email) · Cloudflare Turnstile · GA4 + Meta Pixel · UploadThing.
The full functional spec lives in "Solar Works Vault/Solar Works - Website Production Build Guide.md" and "06-Analytics-and-QA/Spec Alignment Audit.md". Read the vault before acting.

CURRENT STATE (verify, don't assume):
  - Phase-1 code is complete and security-reviewed (PR #1). Both apps build. Every third-party feature is wired but OFF until its env key is set, falling back to a safe no-op.
  - The AI chatbot IS built (real Groq integration: landing app/api/chat/route.ts + chat-launcher.tsx), gated on GROQ_API_KEY.
  - Leads flow: landing form/chatbot -> landing /api/leads proxy -> platform /api/leads -> MongoDB -> Resend email + staff inbox.
  - The platform customer portal is a PLACEHOLDER (Phase 2). Content/photos are placeholders ("SOLARWORK IMAGE TO BE PROVIDED").

WORKING RULES (must follow):
  - Both apps are pnpm-only. Never run npm (it crashes). Use: pnpm install, pnpm build, pnpm typecheck, pnpm lint.
  - NEVER run prettier/format (no config; would add semicolons to a no-semicolon codebase).
  - MongoDB on this machine: DNS refuses SRV records — use the explicit non-SRV Atlas URI in .env (see vault "DB SRV DNS workaround").
  - Security baseline: secrets server-side only, never in client bundles; validate all input (Zod); deny-by-default auth re-checked server-side on every action. Run /security-review before considering a phase done.
  - Make small, focused commits with descriptive messages. Branch off main; do not push or open PRs without explicit approval.
  - At the END of every working session, append a daily report to "Solar Works Vault/Daily Reports/YYYY-MM-DD.md" written as PLAIN ENGLISH SENTENCES in flowing paragraphs — NO asterisks (no bold/italic) and NO dash bullets in the body. Headings and YAML frontmatter are fine.
  - Keep the vault updated as decisions/status change (it is the handover record).

PHASES TO COMPLETE (in order; each has a definition of done):

  PHASE 1 — Launch the Phase-1 website
    1. Run a full local QA pass of QA-01..QA-10 (see vault Pre-Launch QA Checklist) with test keys; fix every bug found in the apps.
    2. Confirm both apps pass pnpm build, pnpm typecheck, pnpm lint with no errors.
    3. Tighten "09-Handover/Admin Handover and Go-Live Guide.md" into an exact step-by-step the client can follow.
    DONE WHEN: QA-01..QA-10 pass locally, both apps build clean, go-live guide is complete, and a /security-review shows no findings.

  PHASE 2a — Customer portal (real features)
    The spec has no detail here, so FIRST write a feature spec note in the vault (audience: a logged-in customer sees their own data — e.g. their leads/quotes, project progress/status, documents). Get the scope confirmed before building. Then implement against solarworks-platform with the existing role model (customer role, server-side auth checks).
    DONE WHEN: a customer logs in and sees only their own records; staff/admin can manage them; spec note + tests exist.

  PHASE 2b — Solar Savings Tracker
    Spec is already written: "08-Architecture/Feature - Solar Savings Tracker.md" (status: postponed). Build the MVP exactly as specced: lives in solarworks-platform; staff upload two monthly Deye exports (CSV/XLSX); savings = solar kWh produced × the customer's own utility tariff (editable per-provider table); month-over-month comparison view; staff-triggered consent-gated savings email via Resend; figures always labelled estimates.
    DONE WHEN: the MVP scope in that note is implemented and tested.

STOP AND ASK THE HUMAN (do NOT fabricate these — pause and request them):
  - Any production secret/account: real MongoDB Atlas prod password, BETTER_AUTH_SECRET, LEADS_INGEST_KEY, Groq key, Resend key + verified sender + recipient list, Cloudflare Turnstile keys, GA4/Meta Pixel IDs, UploadThing token.
  - The production domain and hosting choice (deployment) — do not deploy without it.
  - Real Solar Works photos and the testimonial location/system-type confirmations.
  - PHASE 2b is BLOCKED until the human provides two real monthly Deye export files AND decides what counts as "saved" (all solar kWh produced, vs only self-consumed kWh). Do not start 2b without both.
  - PHASE 2a scope confirmation before building.

REPORT progress at each phase boundary and whenever blocked.
```

## Related

- [[Admin Handover and Go-Live Guide]]
- [[Spec Alignment Audit]]
- [[Feature - Solar Savings Tracker]]
- [[Pre-Launch QA Checklist]]
