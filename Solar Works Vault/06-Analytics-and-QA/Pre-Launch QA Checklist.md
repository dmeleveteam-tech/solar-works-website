---
title: Pre-Launch QA Checklist
type: qa
tags: [solar-works, website, qa]
source: "Website Functional Specifications v1.0"
qa_run: 2026-07-01
---

# Pre-Launch QA Checklist

Local QA pass run 2026-07-01 against both apps (landing :3000, platform :3001)
with a test ingest key and the live MongoDB Atlas dev cluster. Items needing a
third-party production key (Groq, Resend, GA4/Meta, Turnstile) were verified by
exercising their code path with the key absent (safe fallback) and confirming
the wired behaviour; they get a final live confirmation once the real key is set
during go-live.

- [x] **QA-01** — A visitor can watch testimonial videos on mobile and desktop without page breakage or intrusive autoplay. *Verified: the video card is a thumbnail facade; the YouTube (nocookie) iframe is only mounted when the dialog opens, with no `autoplay=1`, so nothing plays or loads in the background.*
- [x] **QA-02** — A visitor can submit the form successfully and a complete, correctly labeled row appears in the leads database. *Verified end-to-end: a full form POST through the landing proxy returned 201 and wrote one lead document to MongoDB with status `new` and every field mapped into labelled details. (Spec says Google Sheets; build uses a MongoDB collection — see open item in [[Spec Alignment Audit]], pending client sign-off.)*
- [x] **QA-03** — A visitor can complete the chatbot qualification flow; the same data is saved with `Channel` = `Website Chatbot`. *Verified: the chatbot forwards leads with source `chatbot`, which the platform stores and labels `Website Chatbot` (label corrected 2026-07-01 from `Chatbot`). A full live conversation needs `GROQ_API_KEY`; without it the assistant safely hands off to the form/Viber.*
- [x] **QA-04** — Consent is required before a lead is committed as a contactable lead. *Verified: the form blocks submission until the consent box is ticked, and every ingested lead starts at status `new` for staff review. (Consent is enforced in the browser; the server treats all new leads as needing review rather than storing a consent boolean.)*
- [x] **QA-05** — A new lead generates the agreed internal notification. *Verified in code: on insert the platform fires a Resend email (HTML-escaped, includes all detail rows and a dashboard link) as fire-and-forget, so a notification failure never blocks lead capture. Sends once `RESEND_API_KEY` + verified sender + recipient list are set; no-ops cleanly until then.*
- [x] **QA-06** — All CTAs route correctly to form, chatbot, or direct contact options. *Verified: every site route returns 200; the primary CTA points to `/contact`, the chatbot launcher opens in-page, and phone/Viber/WhatsApp/email links use valid `tel:`/`viber:`/`wa.me`/`mailto:` hrefs (numbers/emails are placeholders to be replaced at go-live).*
- [x] **QA-07** — UTM parameters are recorded when supplied in the page URL. *Fixed 2026-07-01 (was missing) and verified: first-touch `utm_source/medium/campaign/content/term`, `landing_page`, and `referrer` are captured on entry, survive navigation, and are stored with both form and chatbot leads (satisfies spec L-04).*
- [x] **QA-08** — Admin can add a new testimonial and feature it on the home page without developer support. *Verified at the data layer: the CMS create/publish/reorder actions are auth-gated (deny-by-default; `/cms` redirects anonymous users to login), and the public content API returns published items only, which the marketing site renders with a 5-minute ISR window. Featuring = publish + ordering; projects also have a `featured` flag for the home grid.*
- [x] **QA-09** — No Google credentials, API keys, or sensitive tokens are exposed in front-end source code. *Verified: scanning both production client bundles (`.next/static`) for the ingest key, auth secret, and DB password found nothing; all secrets are read only in `server-only` modules, and the only `NEXT_PUBLIC_*` values are the intentionally-public GA/Pixel/Turnstile site keys.*
- [x] **QA-10** — Analytics events appear in GA4 / platform test environment after execution. *Verified in code: GA4 and Meta Pixel scripts load only after consent is `granted`, and `track()` no-ops until then; conversion events are wired at every call site. Final confirmation in GA4's realtime view once `NEXT_PUBLIC_GA_ID` is set.*

## Bugs found and fixed during this QA pass

1. Three `react-hooks/set-state-in-effect` lint errors in the platform (use-mobile, users-manager, content-manager) — refactored to the React-recommended patterns; both apps now pass `pnpm build`, `typecheck`, and `lint` clean.
2. UTM / landing-page attribution was not captured at all (QA-07 / L-04) — implemented for both lead paths.
3. `/our-work` and `/customer-stories` returned HTTP 500 whenever they rendered CMS images, because `next/image` had no `remotePatterns` for the image host — both apps' `next.config.ts` now allow UploadThing, Unsplash (seed), and YouTube.
4. Lead channel label was `Chatbot`; the spec requires `Website Chatbot` — corrected.

## Related

- [[Analytics and Conversion Events]]
- [[Developer Deliverables]]
- [[Lead Capture Form]]
- [[MOC - Analytics and QA]]
- [[Admin Handover and Go-Live Guide]]
