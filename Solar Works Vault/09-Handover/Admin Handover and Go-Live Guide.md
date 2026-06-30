---
title: Admin Handover and Go-Live Guide
type: handover
tags: [solar-works, handover, deployment, credentials, go-live]
created: 2026-06-30
status: draft
---

# Admin Handover and Go-Live Guide

The handover package called for in [[Non-Functional Requirements|NFR-06]] and the
[[Developer Deliverables]] checklist: how the site is put together, every account
and key it needs, how to take it live, how to edit content, and how to recover it.

> [!warning] Status: draft — pre-launch
> Nothing is deployed yet. The code is complete and security-reviewed (PR #1),
> but the items in [[#1. Go-live checklist]] must be done before launch. All
> third-party features are **off by default** until their keys are filled in.

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
- [ ] Supply real Solar Works photos to replace the "SOLARWORK IMAGE TO BE PROVIDED" placeholders.
- [ ] Confirm each video testimonial's location and system type (Grid-Tied/Hybrid), then publish.
- [ ] Run the full [[Pre-Launch QA Checklist]] (QA-01 … QA-10) end-to-end.
- [ ] Point `PLATFORM_INGEST_URL` / `PLATFORM_CONTENT_URL` / `BETTER_AUTH_URL` / `APP_URL` at the **production** domains (not localhost).
- [ ] Set `siteConfig.url` in the landing app to the real domain (used by sitemap/robots/OG).

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
3. **Add / edit:** fill the form; image fields have an **Upload image** button (needs `UPLOADTHING_TOKEN`).
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

_Drafted 2026-06-30._
