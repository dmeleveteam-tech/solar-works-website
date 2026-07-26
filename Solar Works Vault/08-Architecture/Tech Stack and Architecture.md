---
title: Tech Stack and Architecture
type: decision
tags: [solar-works, website, architecture, tech-stack, decision]
source: "Stack brainstorm 2026-06-29; revised against the shipped build 2026-07-26"
created: 2026-06-29
updated: 2026-07-26
status: decided
---

# Tech Stack and Architecture

> [!info] Status
> Stack decided 2026-06-29 and **revised 2026-07-26** to match what was actually
> built. This note is the source of truth for technology choices and how the
> pieces fit together. Update it as decisions evolve.

> [!warning] What changed since the original brainstorm
> Four decisions in the 2026-06-29 version were superseded during the build. The
> note still described them, which made it actively misleading — hence this
> revision.
>
> | Originally decided | Shipped instead | Why |
> |---|---|---|
> | Hosting: **Render** | **Vercel** | Two Next.js apps deployed from one repo, preview deploys per branch, zero-config Next support. |
> | Lead store: **Google Sheets** (system of record) | **MongoDB**, read through the platform dashboard | A Google service-account key and the Sheets quota bought nothing once the platform app existed: sales reads the dashboard, which queries Mongo directly. Sheets can still be fed downstream via n8n if it is ever wanted. |
> | CMS: **Payload CMS** | **Custom CMS inside the platform app** | Payload was never installed. The platform already owned auth, roles and Mongo, so content editing became a set of pages there rather than a second framework with its own admin, schema and session model. |
> | Chatbot: **third-party** (Voiceflow / Chatbase) | **Own brain** — Groq LLM + Cohere embeddings, `lib/chat/brain.ts` | The outbound-webhook constraint was the whole reason to shortlist a platform. Owning the brain removed that constraint, and made it possible to serve the web widget and Messenger from one implementation. |
>
> **What did NOT change: Mongo-first lead durability.** The original rule — write
> to Mongo first, then fan out — is exactly what `lib/leads-ingest.ts` does. Only
> the fan-out targets changed.

## Stack at a glance

| Layer | Choice | Role |
|---|---|---|
| Framework | **Next.js** (App Router) | SSR/SSG for SEO ([[Global Requirements\|G-05]]); route handlers hold server-side secrets ([[Non-Functional Requirements\|NFR-02]], [[Pre-Launch QA Checklist\|QA-09]]). |
| UI | **shadcn/ui** + Tailwind | Premium, accessible component primitives ([[Non-Functional Requirements\|NFR-04]]). |
| Database | **MongoDB Atlas** | The one datastore: leads, users/sessions, CMS content, KB chunks + vectors, Messenger sessions. |
| Auth | **better-auth** (Mongo adapter) | Email/password + optional Google, roles via the admin plugin. Platform app only. |
| CMS | **Custom, inside the platform app** | Testimonials, projects, FAQs. Published content is served to the marketing site over `GET /api/content` with ISR caching. |
| Lead store | **MongoDB** (`leads`) | Sales system of record; read through the platform dashboard. |
| Lead durability | **Mongo first, then fan out** | Durable write, then Resend email and n8n dispatch — both fire-and-forget ([[Lead Capture Form\|L-05]]). |
| Chatbot | **In-house brain** — Groq (`openai/gpt-oss-120b`), Cohere `embed-multilingual-v3.0` | `solarworks-platform/lib/chat/brain.ts`. Serves BOTH the site widget and the Messenger bot. |
| Retrieval | **MongoDB Atlas Vector Search** | KB chunks embedded with Cohere; `KB_MIN_SCORE` gates answering vs escalating. |
| Messenger | **Facebook Messenger Platform** | `POST /api/messenger/webhook` in the platform app. Same brain, per-PSID state in `messenger_sessions`. |
| Automation | **n8n** (optional) | Every captured lead is POSTed to a webhook for downstream fan-out. Unset = no dispatch. |
| Email | **Resend** | Instant sales notification on a new lead. |
| Uploads | **Cloudinary** | CMS images, video and customer documents. |
| Spam | **Cloudflare Turnstile** | Form abuse protection ([[Non-Functional Requirements\|NFR-02]]). |
| Analytics | **GA4 + Meta Pixel** | Conversion events, loaded only after consent ([[Integration - GA4 and Meta Pixel]], [[Global Requirements\|G-06]]). |
| Video | **YouTube / Vimeo** lazy muted embeds | Fast media delivery ([[Global Requirements\|G-07]], [[Non-Functional Requirements\|NFR-01]]). |
| Hosting | **Vercel** | Two projects from one repo — see below. |

## Two apps, one repo

| Directory | Vercel project | Public URL | Owns |
|---|---|---|---|
| `solarworks-landingpage` | `solar-works-website` | solar-works-website.vercel.app | The public marketing site. Holds **no** LLM key and **no** Messenger secret. |
| `solarworks-platform` | `solar-works-admin` | solar-works-admin.vercel.app | Database, auth, dashboard, CMS, chat brain, KB retrieval, Messenger webhook. |

The split is a secrets boundary as much as a code one: everything needing a
credential or the database lives in the platform, and the marketing site talks to
it over authenticated HTTP with a shared key per endpoint (`CHAT_API_KEY`,
`LEADS_INGEST_KEY`).

> [!important] Cross-app URLs must be absolute production URLs
> `CHAT_API_URL`, `PLATFORM_INGEST_URL` and `PLATFORM_CONTENT_URL` point at the
> platform. In local dev they are `http://localhost:3001/...`; **on Vercel they
> must be the platform's real URL.** A localhost value deployed to production
> fails silently — the chat widget degrades to its human hand-off and reads as
> merely "unavailable" rather than broken. This happened; see the 2026-07-26
> daily report.

## Lead pipeline

```
Website form ─┐
Chat widget ──┼─► POST /api/leads ─► MongoDB (durable write, assigns Lead ID)
Messenger bot ┘   (lib/leads-ingest)   ├─► Resend (instant sales email)
                                       └─► n8n webhook (optional fan-out)
```

All three channels converge on `lib/leads-ingest.ts` — one choke point, so no
channel can bypass consent, notification or dispatch. The channel is recorded on
`source`: `website_form`, `chatbot`, `messenger` (plus staff-only `manual`, which
the public ingest endpoint deliberately refuses).

Downstream steps are fire-and-forget and never throw: an n8n outage or a Resend
failure must not cost a consented lead.

## Chat brain — one implementation, two channels

The brain lives in the platform. The marketing site's `/api/chat` is a thin proxy
that clamps input, whitelists attribution and owns the visitor-facing fallback
copy; the Messenger webhook calls the same `runChatTurn` with
`channel: "messenger"`.

The channel differences are deliberate and small: Messenger has no multi-field
form, so `collect_details` is withheld and fields are asked one at a time;
structured blocks render as quick replies, where the 20-char `title` is display
text and the 1000-char `payload` carries the canonical labelled string the brain
parses. See [[Integration - Facebook Messenger Bot]].

## Secrets boundaries (never cross to the browser)

Per [[Pre-Launch QA Checklist\|QA-09]] and [[Non-Functional Requirements\|NFR-02]]:

- `MONGODB_URI`, `BETTER_AUTH_SECRET`, `GROQ_API_KEY`, `COHERE_API_KEY`,
  `RESEND_API_KEY`, `CLOUDINARY_API_SECRET`, `FB_APP_SECRET`,
  `FB_PAGE_ACCESS_TOKEN` — platform env vars, server-side only.
- Shared keys (`CHAT_API_KEY`, `LEADS_INGEST_KEY`, `KB_SEARCH_KEY`) exist in both
  apps and must match exactly.
- Only `NEXT_PUBLIC_*` reaches the client — Page ID, Cloudinary cloud name,
  Turnstile site key, analytics IDs. All are non-secret by design.

## Open follow-ups

- [ ] Messenger App Review (Business Verification + `pages_messaging`) before the
      bot can reply to the public — see [[Messenger Bot — Meta Setup Checklist]].
- [ ] Groq paid tier: the free 8k tokens/minute is shared by both channels and is
      already reached during single-tester sessions.
- [ ] A publicly reachable n8n — Vercel cannot reach a local instance, so
      dispatch is inert in production until then.
- [ ] Custom domain, replacing the `*.vercel.app` URLs (and with it
      `BETTER_AUTH_URL`, `MARKETING_SITE_URL` and the cross-app URLs above).
- [ ] Map each spec analytics event to GA4/Meta Pixel wiring
      ([[Analytics and Conversion Events]]).

## Related

- [[Project Summary]] · [[Project Scope]]
- [[Integration - Facebook Messenger Bot]] · [[Integration - AI Lead Chatbot]] · [[Integration - GA4 and Meta Pixel]]
- [[Lead Capture Form]] · [[Global Requirements]] · [[Non-Functional Requirements]]
