---
title: Platform Deployment Goal Prompt
type: handover
tags: [solar-works, goal, prompt, deployment, vercel, platform]
created: 2026-07-16
status: ready
---

# Platform Deployment Goal Prompt

A self-contained prompt for the Claude Code **goal feature** to deploy the
back-office **platform** app to Vercel and wire it to the already-deploying
marketing site. Written to stand alone (a fresh agent may run it with no prior
chat context). It encodes the current state, the hard human-only prerequisites,
the exact Vercel settings, and the acceptance criteria.

> [!info] Why this exists
> The public marketing site (`solarworks-landingpage`) is already being deployed
> to Vercel, but it depends on the **platform** app server-to-server: the contact
> form and chatbot POST leads to it, and CMS content is read from it. Until the
> platform is deployed and the two are wired together, **leads have nowhere to go**
> and the site serves only its bundled static content. This prompt closes that gap.

> [!warning] Hard prerequisite — a real database
> The platform's local `.env` currently points `MONGODB_URI` at an **in-memory**
> MongoDB (`mongodb-memory-server`), which is dev-only: it evaporates on restart
> and is not reachable over the network. Before anything can deploy you MUST have
> a real **MongoDB Atlas** cluster (free M0 tier is enough) and its connection
> string. This is a human step — the agent cannot create it.

## Prompt

```
GOAL: Deploy the Solar Works PLATFORM app to Vercel and connect it to the
marketing site so that leads and CMS content work end-to-end in production.

REPO: C:\New folder\solar-works-website  (git branch: main; GitHub: dmeleveteam-tech/solar-works-website)
Two Next.js 16 apps in one repo, deployed as SEPARATE Vercel projects:
  - solarworks-landingpage/  = public marketing site  (already on Vercel)
  - solarworks-platform/     = back-office: logins, leads inbox, CMS, portal  (THIS task)
Stack: Next.js 16 (React 19) · MongoDB Atlas · better-auth · shadcn/ui · Resend · UploadThing.
Read "Solar Works Vault/09-Handover/Admin Handover and Go-Live Guide.md" before acting — it is
the authoritative runbook; this prompt is the Vercel-specific slice of its section 1D.

CURRENT STATE (verified 2026-07-16 — re-verify, don't assume):
  - Code is complete. Both apps pass typecheck + lint clean. Platform routes exist for
    /login /signup /admin /admin/users /dashboard /dashboard/projects /dashboard/savings
    /cms /portal and api/{auth,content,leads,uploadthing}.
  - The DB client (lib/mongodb.ts) is serverless-safe: a module-level MongoClient singleton
    reused across warm invocations. No change needed for Vercel.
  - env.ts validates process.env at module load. REQUIRED for a successful build:
    MONGODB_URI and BETTER_AUTH_SECRET. MONGODB_DB defaults to "solarworks",
    BETTER_AUTH_URL defaults to localhost. All other keys are optional / degrade to no-op.
  - Git author identity on this machine was fixed to  maxxi02 <m44156529@gmail.com>  so Vercel
    accepts the commits (it rejects deploys whose commit author isn't linked to the Vercel team).
    Keep committing under that identity.

WORKING RULES (must follow):
  - pnpm-only. Never run npm (it crashes on this setup). Never run prettier/format
    (no-semicolon codebase; formatting would add semicolons).
  - On THIS dev machine, DNS refuses SRV records — a local Atlas connection needs the
    non-SRV URI form (see vault "DB SRV DNS workaround"). Vercel's DNS resolves SRV fine,
    so in Vercel use the normal  mongodb+srv://…  string Atlas gives you.
  - Secrets live only in Vercel env vars and local .env (git-ignored). Never commit a real
    secret. Only .env.example (placeholders) is committed.
  - Small, focused commits under the maxxi02 identity. Do not force-push main.
  - At end of session, append a plain-English daily report to
    "Solar Works Vault/Daily Reports/YYYY-MM-DD.md" (flowing paragraphs; no bold, no bullets).

STOP AND ASK THE HUMAN (do NOT fabricate — pause and request):
  - The real MongoDB Atlas connection string (mongodb+srv://…) and that its Network Access
    allows Vercel (add 0.0.0.0/0, or Vercel's egress, to the Atlas IP allow-list).
  - A fresh production BETTER_AUTH_SECRET  (generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))").
  - One strong LEADS_INGEST_KEY, set IDENTICALLY in the platform AND the landing Vercel projects.
  - Access to the Vercel account/team that owns the landing project, to create the platform project.
  - Optional-but-recommended keys when ready: Google OAuth, Resend (+ verified sender + recipient),
    UploadThing token. Each is safe to add later.

STEPS (in order):

  1. Create the Vercel project for the platform:
       - New Project -> import  dmeleveteam-tech/solar-works-website  (same repo as the landing project).
       - Set ROOT DIRECTORY = solarworks-platform   (this is a Vercel dashboard setting, NOT a
         committed vercel.json — an earlier attempt to set rootDirectory via vercel.json was invalid
         and was removed. Do not re-add one.)
       - Framework preset: Next.js (auto). Build: default (Vercel runs the app's `build`).
         pnpm is auto-detected from pnpm-lock.yaml.

  2. Set environment variables in the platform Vercel project (Production + Preview), BEFORE the
     first build (env.ts throws at build time if the required ones are missing):
       REQUIRED:  MONGODB_URI, BETTER_AUTH_SECRET
       SET:       MONGODB_DB = solarworks
       FOR LEADS: LEADS_INGEST_KEY  (must match the landing project's value)
       AFTER FIRST DEPLOY: BETTER_AUTH_URL = the platform's real HTTPS URL (see step 3).
       OPTIONAL:  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, RESEND_API_KEY / LEADS_NOTIFY_FROM /
                  LEADS_NOTIFY_TO, UPLOADTHING_TOKEN, APP_URL.

  3. Resolve the BETTER_AUTH_URL chicken-and-egg:
       - better-auth needs its own public base URL. Either (a) deploy once to get the Vercel URL
         (e.g. https://solarworks-platform.vercel.app), set BETTER_AUTH_URL to it, and redeploy; or
         (b) attach the intended custom domain (e.g. app.solarworks.ph) first and set BETTER_AUTH_URL
         to that from the start. A stale/blank BETTER_AUTH_URL breaks login redirects and cookies.
       - If Google sign-in is used, add  ${BETTER_AUTH_URL}/api/auth/callback/google  as an authorized
         redirect URI in Google Cloud Console.

  4. Seed the first real admin against the ATLAS database (not the in-memory one):
       - Locally, put the real Atlas MONGODB_URI in solarworks-platform/.env, then:
           pnpm seed:superadmin admin@solarworks.ph "<a-strong-password>" "Admin Name"
       - Optionally  pnpm seed:content  for demo projects/testimonials/FAQs.
       - Do NOT run  pnpm seed:roles  against production (it creates demo accounts sharing a weak password).

  5. Wire the marketing site (landing Vercel project) to the deployed platform:
       - PLATFORM_INGEST_URL   = https://<platform-domain>/api/leads
       - PLATFORM_CONTENT_URL  = https://<platform-domain>/api/content
       - LEADS_INGEST_KEY      = the SAME value set in the platform project
       - Redeploy the landing project so it picks up the new env.

  6. Smoke test on production (acceptance):
       - Platform  /login  loads over HTTPS; the seeded admin can sign in and reach /admin.
       - Submit the marketing-site contact form -> a new lead appears in the platform Leads inbox
         (and a Resend email arrives IF Resend keys are set).
       - Open the chatbot on the marketing site; complete the flow -> a lead with source "chatbot"
         appears in the inbox (requires GROQ_API_KEY on the landing project).
       - A CMS edit (publish a testimonial) shows on the public site within ~5 min (ISR window),
         which also confirms PLATFORM_CONTENT_URL is wired.

  DONE WHEN: the platform is live on HTTPS, the seeded admin can log in, a contact-form lead and a
  chatbot lead both land in the platform inbox from the production marketing site, and CMS content
  flows to the public site. Then append the daily report and update the go-live checklist in the
  Admin Handover guide (tick the section 1D deploy items).

OPTIONAL HARDENING (note, don't block launch):
  - Consider setting maxPoolSize on the MongoClient (lib/mongodb.ts) if Atlas connection counts climb
    under many concurrent serverless containers; the free M0 tier allows 500 connections, ample for
    launch traffic, so this is optional.
```

## Related
- [[Admin Handover and Go-Live Guide]] — full runbook; this prompt is its section 1D, Vercel-specific
- [[All-Phases Goal Prompt]] — the whole program from code-complete to launched
- [[Solar Works - Website Production Build Guide]] — full functional spec
- [[Pre-Launch QA Checklist]] — QA-01…QA-10 to run against production
- [[DB SRV DNS workaround]] — only affects the local dev machine, not Vercel

_Drafted 2026-07-16 after independently verifying both apps typecheck + lint clean and confirming the platform is not yet deployed. The marketing site is mid-deploy on Vercel; this closes the platform half._
