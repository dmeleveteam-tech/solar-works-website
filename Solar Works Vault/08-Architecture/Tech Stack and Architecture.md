---
title: Tech Stack and Architecture
type: decision
tags: [solar-works, website, architecture, tech-stack, decision]
source: "Stack brainstorm 2026-06-29"
created: 2026-06-29
status: decided
---

# Tech Stack and Architecture

> [!info] Status
> Stack decided 2026-06-29. This note is the source of truth for technology choices and how the pieces fit together. Update it as decisions evolve.

## Stack at a glance

| Layer | Choice | Role |
|---|---|---|
| Framework | **Next.js** | SSR/SSG for SEO ([[Global Requirements\|G-05]]); API routes hold server-side secrets ([[Non-Functional Requirements\|NFR-02]], [[Pre-Launch QA Checklist\|QA-09]]). |
| UI | **shadcn/ui** + Tailwind | Premium, accessible component primitives ([[Non-Functional Requirements\|NFR-04]]). Init preset: `pnpm dlx shadcn@latest init --preset b6FTdDS7u --template next`. |
| Database | **MongoDB** | App database — backs the CMS content store (not the lead system of record). |
| CMS | **Payload CMS** (Mongo-native) | Runs inside the Next.js repo against MongoDB. Non-dev content editing ([[Global Requirements\|G-08]]); draft/publish covers staging ([[Non-Functional Requirements\|NFR-08]]). |
| Lead store | **Google Sheets** | Sales system of record for Phase 1 ([[Integration - Google Sheets Lead Database]]). |
| Lead durability | **Mongo → Sheets** | Durable write to Mongo first, then sync to Sheets — satisfies [[Lead Capture Form\|L-05]] and the Error Log tab. |
| Email | **Resend** + React Email | Instant sales notification on new lead. |
| Chatbot | **Third-party platform** (Voiceflow / Chatbase shortlist) | Must support a custom knowledge base + **outbound webhook** into `/api/leads`. |
| Spam | **Cloudflare Turnstile** | Form abuse protection ([[Non-Functional Requirements\|NFR-02]]). |
| Analytics | **GA4 + Meta Pixel** via `@next/third-parties` | Conversion events ([[Integration - GA4 and Meta Pixel]], [[Global Requirements\|G-06]]). |
| Video | **YouTube / Vimeo** lazy muted embeds | Fast media delivery ([[Global Requirements\|G-07]], [[Non-Functional Requirements\|NFR-01]]). |
| Hosting | **Render** | Next.js Web Service + env-var secrets. |

## Two stores, two jobs

The spec mandates Google Sheets as the Phase 1 lead database, so MongoDB is **not** the lead system of record. Mongo's job is the **content store** behind the Payload CMS.

- **Leads → Google Sheets** (sales reads here)
- **Content → MongoDB** (testimonials, projects, FAQs, blog — edited via Payload)

## Lead pipeline

```
Form ─┐
      ├─► POST /api/leads ─► MongoDB (durable write, assigns Lead ID)
Bot ──┘                      ├─► Google Sheets (sales record)
                             ├─► Resend (instant sales email)
                             └─► Error Log + retry on Sheets failure
```

> [!important] Chatbot ↔ durability consistency
> Because the chatbot is a **third-party platform** but lead durability is **Mongo-first**, the chatbot must **not** write to Google Sheets directly. It must fire an **outbound webhook to `/api/leads`** on a consented, qualified lead. This gives form and bot leads identical durability, Lead ID format, and Error Log behavior. "Supports outbound webhooks/custom actions" is therefore a **hard requirement** when selecting the platform.

## Secrets boundaries (never cross to the browser)

Per [[Pre-Launch QA Checklist\|QA-09]] and [[Non-Functional Requirements\|NFR-02]]:

- Google service-account key — Render env var, used only in `/api/leads`.
- Resend API key — Render env var, server-side only.
- Never exposed in client bundles.

## Open follow-ups

- [ ] Select the specific chatbot platform (confirm webhook/custom-action support before committing).
- [ ] Confirm Render service type + how `next/image` optimization is handled (CDN vs server).
- [ ] Map each spec analytics event to GA4/Meta Pixel wiring ([[Analytics and Conversion Events]]).

## Related

- [[Project Summary]] · [[Project Scope]]
- [[Integration - Google Sheets Lead Database]] · [[Integration - AI Lead Chatbot]] · [[Integration - GA4 and Meta Pixel]]
- [[Lead Capture Form]] · [[Global Requirements]] · [[Non-Functional Requirements]]
