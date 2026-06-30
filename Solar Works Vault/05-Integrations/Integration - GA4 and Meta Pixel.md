---
title: Integration - GA4 and Meta Pixel
type: integration
tags: [solar-works, website, integration, analytics]
source: "Website Functional Specifications v1.0"
---

# Integration — GA4 and Meta Pixel

Analytics instrumentation per [[Global Requirements|G-06]]. Tracks conversion events for attribution and funnel analysis.

## Setup

- Install GA4 and Meta Pixel across all public pages.
- Fire the conversion events defined in [[Analytics and Conversion Events]].
- Solar Works retains ownership of the analytics and Meta Pixel accounts ([[Non-Functional Requirements|NFR-06]]).

## Tracked Conversion Events (summary)

`testimonial_video_play`, `lead_form_start`, `lead_form_submit`, `chatbot_open`, `chatbot_qualified_lead`, `phone_click`, `viber_click`, `whatsapp_click`, `project_view`, `solution_view`.

See [[Analytics and Conversion Events]] for triggers and business use.

## Implementation status (2026-06-30)

Implemented in the marketing app (`solarworks-landingpage`):

- **Consent-gated loading.** GA4 and Meta Pixel scripts load only after the visitor accepts via the cookie-consent banner (NFR-03). Declining keeps both off. Choice persists in `localStorage`.
- **Config-gated.** Each provider is enabled by an env var — `NEXT_PUBLIC_GA_ID` (GA4) and `NEXT_PUBLIC_META_PIXEL_ID` (Meta Pixel). With neither set, no banner and no scripts load. Solar Works owns both accounts (NFR-06); only the public IDs ship to the browser.
- **Events wired:** `lead_form_start`, `lead_form_submit`, `testimonial_video_play`, `chatbot_open`, and `phone_click` / `viber_click` / `whatsapp_click` (one delegated listener across header, footer, and mobile CTA bar).
- **Not yet wired:** `chatbot_qualified_lead` (waits on the real chatbot) and `project_view` / `solution_view` (no per-item detail routes exist yet).
- **Code:** `lib/analytics.ts` (event contract + `track()`), `components/analytics.tsx` (loader), `components/consent-provider.tsx` + `components/consent-banner.tsx` (consent).

## Related

- [[Analytics and Conversion Events]]
- [[Global Requirements]]
- [[MOC - Integrations]]
