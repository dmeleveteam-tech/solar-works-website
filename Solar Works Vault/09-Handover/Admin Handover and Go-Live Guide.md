---
title: Admin Handover and Go-Live Guide
type: handover
tags: [solar-works, handover, deployment, credentials, go-live]
created: 2026-06-30
updated: 2026-07-01
status: ready
---

# Admin Handover and Go-Live Guide

The handover package called for in [[Non-Functional Requirements|NFR-06]] and the
[[Developer Deliverables]] checklist: how the site is put together, every account
and key it needs, how to take it live, how to edit content, and how to recover it.

> [!warning] Status: ready for go-live — not yet deployed
> The code is complete, security-reviewed (PR #1), and has passed a full local
> QA pass (see [[Pre-Launch QA Checklist]], run 2026-07-01); both apps build,
> typecheck, and lint clean. Nothing is deployed yet. Work the checklist in
> [[#1. Go-live checklist]] top to bottom. All third-party features are **off by
> default** and degrade to a safe no-op until their keys are filled in, so you
> can bring them online one at a time.
>
> A few steps below need decisions or accounts only Solar Works can provide
> (hosting + domain, real photos, and each production key). Those are marked
> **(Solar Works to provide)**.

---

## System at a glance

The website is **two separate applications** that talk to each other server-to-server:

| App | Folder | Purpose | Who uses it |
| --- | --- | --- | --- |
| **Marketing site** | `solarworks-landingpage` | The public website visitors see | Anyone (public) |
| **Platform (back-office)** | `solarworks-platform` | Logins, leads inbox, CMS | Solar Works staff/admins |

- **Stack:** Next.js (React) · MongoDB Atlas · better-auth · shadcn/ui. See [[Tech Stack and Architecture]].
- **Roles:** superadmin, staff, content_editor, customer (see [[#Role and access model]]).

### How data flows

```
Visitor → contact form  ─┐
                         ├─→ landing /api/leads (proxy, holds the shared key)
Visitor → AI chatbot ────┘        │  server-to-server, x-ingest-key
                                  ▼
                         platform POST /api/leads  →  MongoDB "leads"  →  Resend email to sales
                                                                         →  Staff Leads inbox

Content editor → CMS (/cms) → MongoDB (projects/testimonials/faqs)
                                  │ published items only
                                  ▼
                         platform /api/content/[type]  →  landing site (ISR, 5-min cache)
```

Key security property: **secrets never reach the browser.** The Groq key, the
ingest key, the Resend key, and the DB string all live server-side only. See the
security review summary in PR #1.

---

## 0. Running the apps (exact commands)

Both apps use **pnpm only** — do not run `npm` (it crashes on this setup), and
never run a formatter/prettier (the codebase is intentionally no-semicolon).
Each app is its own folder with its own `.env`.

Prerequisites: Node.js 20+, `pnpm` (`npm i -g pnpm`), and a MongoDB Atlas
connection string.

First-time setup, per app:

```bash
# 1. Marketing site
cd solarworks-landingpage
cp .env.example .env          # then fill in values (see section 2)
pnpm install

# 2. Platform (back-office)
cd ../solarworks-platform
cp .env.example .env          # then fill in values (see section 2)
pnpm install
```

Generate the two required secrets (run in either app folder):

```bash
# BETTER_AUTH_SECRET (platform) and LEADS_INGEST_KEY (BOTH apps, same value)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Create the first real admin account (platform), then optionally seed demo
content:

```bash
cd solarworks-platform
pnpm seed:superadmin admin@solarworks.ph "<a-strong-password>" "Admin Name"
pnpm seed:content        # optional: loads sample projects/testimonials/FAQs
# pnpm seed:roles        # local testing only — creates demo accounts that all
                         # share a weak password; do NOT run against production
```

Run locally (two terminals): platform on `:3001`, marketing site on `:3000`.

```bash
# terminal 1
cd solarworks-platform && pnpm dev
# terminal 2
cd solarworks-landingpage && pnpm dev
```

Build for production (what the host runs):

```bash
pnpm install --frozen-lockfile
pnpm build      # in each app
pnpm start      # platform serves on :3001, marketing site on :3000
```

> [!tip] Checks before shipping a change
> In each app: `pnpm typecheck`, `pnpm lint`, and `pnpm build` should all pass
> with no errors. They do today.

---

## 1. Go-live checklist

Work top to bottom. Until these are done, the relevant feature is a safe no-op.

### A. Secrets to rotate (security — do first)
- [ ] **MongoDB database password** — currently `password0123` (weak). Change it in Atlas and update `MONGODB_URI` in the platform `.env`. See [[DB SRV DNS workaround]] for the connection-string format quirk on the dev machine.
- [ ] **Temporary account passwords** — the `seed:roles` demo accounts all share one weak password. Reset each real account's password before launch.
- [ ] **`BETTER_AUTH_SECRET`** — generate a fresh 32-byte value for production (don't reuse the dev one).
- [ ] **`LEADS_INGEST_KEY`** — generate one strong value and set it **identically** in *both* apps' `.env`.

### B. Service accounts / keys to create
See [[#2. Credentials and accounts inventory]] for where each comes from.
- [ ] Groq API key → chatbot
- [ ] UploadThing token → CMS image uploads
- [ ] Resend key + verified sender + recipient list → sales email alerts
- [ ] Cloudflare Turnstile site + secret key → contact-form spam protection
- [ ] GA4 Measurement ID + Meta Pixel ID → analytics

### C. Content & verification
- [ ] **(Solar Works to provide)** Supply real Solar Works photos to replace the "SOLARWORK IMAGE TO BE PROVIDED" placeholders, and upload them in the CMS (section 3). CMS images must come from an allowed host — UploadThing uploads always work; for an external URL the host must be in `next.config.ts` → `images.remotePatterns` (currently UploadThing, Unsplash, and YouTube thumbnails).
- [ ] **(Solar Works to provide)** Confirm each video testimonial's real YouTube video ID, location, and system type (Grid-Tied/Hybrid), then publish. The seeded entries use placeholder `mock-…` IDs.
- [ ] Update the brand/contact details in `solarworks-landingpage/lib/site-config.ts` (phone, Viber/WhatsApp number, email, social links) — they are currently placeholders.
- [ ] Set `siteConfig.url` in the landing app to the real domain (used by sitemap/robots/OG).
- [ ] Run the full [[Pre-Launch QA Checklist]] (QA-01 … QA-10) end-to-end against the production URLs once deployed.

### D. Deploy
- [ ] **(Solar Works to provide)** Choose the **hosting** and register the **production domain(s)**. The two apps deploy independently and each need a public HTTPS URL — e.g. `solarworks.ph` (marketing site) and `app.solarworks.ph` (platform). Any Node host that runs `pnpm build` + `pnpm start` works (Render, Railway, a VPS, etc.); the tech-stack note assumed Render. Decide one subdomain/URL per app before setting the env values below.
- [ ] Deploy **platform** first (the marketing site depends on it for leads + content). Set its production `.env`, then deploy and confirm `/login` loads over HTTPS.
- [ ] Set `BETTER_AUTH_URL` (and `APP_URL`) to the platform's real HTTPS URL.
- [ ] Deploy **marketing site**. Point `PLATFORM_INGEST_URL` and `PLATFORM_CONTENT_URL` at the platform's real domain (`…/api/leads`, `…/api/content`), not localhost.
- [ ] Confirm the same `LEADS_INGEST_KEY` is set in **both** production environments.
- [ ] If using Google sign-in, add the production callback `…/api/auth/callback/google` in Google Cloud Console.
- [ ] Smoke test on production: submit the contact form and confirm the lead lands in the inbox + a sales email arrives; open the chatbot; load each page.

---

## 2. Credentials and accounts inventory

> [!danger] Never commit `.env`
> Both apps keep real secrets in a local `.env` (git-ignored). Only `.env.example`
> (placeholders) is committed. Store the real values in a password manager.

### Platform app (`solarworks-platform/.env`)

| Variable | What it's for | Where to get it | Required? |
| --- | --- | --- | --- |
| `MONGODB_URI` | Database connection | MongoDB Atlas → Connect | **Yes** |
| `MONGODB_DB` | Database name (`solarworks`) | — | Yes |
| `BETTER_AUTH_SECRET` | Session signing secret | Generate (32-byte random) | **Yes** |
| `BETTER_AUTH_URL` | Public base URL of the platform | Your domain | **Yes** |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | "Continue with Google" for customers | Google Cloud Console → Credentials | Optional |
| `LEADS_INGEST_KEY` | Shared key for the public lead endpoint | Generate; **must match landing app** | For leads |
| `UPLOADTHING_TOKEN` | CMS image uploads | uploadthing.com → app API key | For uploads |
| `RESEND_API_KEY` | Sends the sales email alert | resend.com → API keys | For email |
| `LEADS_NOTIFY_FROM` | Verified sender address | Resend (verified domain/sender) | For email |
| `LEADS_NOTIFY_TO` | Sales recipient inbox(es), comma-sep | Your choice | For email |
| `APP_URL` | Dashboard link in the email (defaults to `BETTER_AUTH_URL`) | Your domain | Optional |

### Marketing site (`solarworks-landingpage/.env`)

| Variable | What it's for | Where to get it | Required? |
| --- | --- | --- | --- |
| `PLATFORM_INGEST_URL` | Where the form forwards leads | Platform domain + `/api/leads` | For leads |
| `LEADS_INGEST_KEY` | Shared key | **Must match platform app** | For leads |
| `PLATFORM_CONTENT_URL` | Live CMS content source | Platform domain + `/api/content` | Optional* |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Spam protection | Cloudflare → Turnstile | For spam gate |
| `NEXT_PUBLIC_GA_ID` | GA4 analytics | Google Analytics 4 | Optional |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel | Meta Events Manager | Optional |
| `GROQ_API_KEY` | AI chatbot | console.groq.com/keys | For chatbot |
| `GROQ_MODEL` | Model override (optional) | Defaults to `llama-3.3-70b-versatile` | Optional |

\* When `PLATFORM_CONTENT_URL` is unset the site renders its **bundled static
content** instead — useful as a fallback, but CMS edits won't show until it's set.

### Accounts that should be registered to Solar Works (NFR-06)
Domain registrar · hosting · MongoDB Atlas · Google Workspace (OAuth + GA4) ·
Meta Business (Pixel) · Cloudflare (Turnstile) · Resend · UploadThing · Groq.
Each should use a **Solar Works-controlled email**, not a developer's personal one.

---

## 3. Editing content (CMS guide)

1. Sign in to the platform at `/login` with a **content editor** or **superadmin** account.
2. Go to **Content** (`/cms`). Three tabs: Projects, Testimonials, FAQs.
3. **Add / edit:** fill the form; image fields have an **Upload image** button (needs `UPLOADTHING_TOKEN`). Uploaded images always display; if you paste an external image URL instead, its host must be allow-listed in `next.config.ts` (see checklist C).
4. **Reorder:** drag rows up/down — the order set here is the order visitors see.
5. **Preview** before publishing with the Preview button (a close approximation of the live site).
6. **Publish/unpublish** with the toggle — only published items appear publicly.
7. Public site reflects changes within ~5 minutes (ISR cache window).

See [[Page - Customer Stories]] for the testimonial field schema (T-02/T-03).

## Role and access model

| Role | Can do |
| --- | --- |
| **superadmin** | Everything: user management, leads (incl. delete), CMS |
| **staff** | Leads inbox (read/create/update/assign), read content |
| **content_editor** | CMS (projects/testimonials/FAQs) |
| **customer** | Customer portal (placeholder for now) |

Every server action re-checks the caller's role server-side — deny by default.

---

## 4. Backup and recovery (NFR-07)

- **What holds the data:** MongoDB Atlas (leads, users, CMS content). This is the
  single source of truth — the apps are stateless and can be redeployed freely.
- **Backups:** enable **Atlas continuous/cloud backups** on the cluster (recommended
  daily snapshots with point-in-time recovery). Atlas → Cluster → Backup.
- **Restore:** restore a snapshot from the Atlas Backup tab to a new or existing
  cluster, then point `MONGODB_URI` at it.
- **Code:** lives in GitHub (`dmeleveteam-tech/solar-works-website`). A redeploy from
  `main` plus the `.env` values fully reconstructs either app.
- [ ] **Action:** confirm Atlas backup is enabled and record the schedule + retention here.

---

## 5. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Contact form says "intake isn't configured" | `LEADS_INGEST_KEY` / `PLATFORM_INGEST_URL` unset or mismatched between apps |
| Form rejected with 401 | The two `LEADS_INGEST_KEY` values don't match |
| Chatbot only offers the form/Viber | `GROQ_API_KEY` not set (or inbox not configured) |
| CMS image upload errors | `UPLOADTHING_TOKEN` not set |
| No sales email on new lead | One of `RESEND_API_KEY` / `LEADS_NOTIFY_FROM` / `LEADS_NOTIFY_TO` missing, or sender not verified |
| Public site shows old/placeholder content | `PLATFORM_CONTENT_URL` unset (serving static fallback), or within the 5-min ISR window |
| Login fails / `querySrv ECONNREFUSED` | DNS can't resolve the SRV record — use the non-SRV URI form ([[DB SRV DNS workaround]]) |

---

## Related
- [[Solar Works - Website Production Build Guide]] — full spec
- [[Developer Deliverables]] · [[Pre-Launch QA Checklist]] · [[Non-Functional Requirements]]
- [[Integration - AI Lead Chatbot]] · [[Integration - GA4 and Meta Pixel]]
- [[Tech Stack and Architecture]] · [[User Flows and Swimlanes]]

_Drafted 2026-06-30; tightened into a step-by-step runbook 2026-07-01 after the local QA pass._
