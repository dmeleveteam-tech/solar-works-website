---
title: Non-Functional Requirements
type: requirements
tags: [solar-works, website, nfr]
source: "Website Functional Specifications v1.0"
---

# Non-Functional Requirements

- [ ] **NFR-01** — Performance: optimize for fast mobile loading; compress images; lazy-load media; avoid autoplay with sound.
  - *Acceptance:* Key public pages load without excessive blocking media; videos are deferred / lazy-loaded.
- [ ] **NFR-02** — Security: HTTPS, secure form submission, server-side validation, spam prevention (e.g., reCAPTCHA / Turnstile), no exposed secrets.
  - *Acceptance:* Security test confirms no API keys or Google credentials are visible in front-end source code.
  - *Status (2026-06-30):* Server-side validation (Zod) and **Cloudflare Turnstile** spam prevention implemented on the contact form — client widget + server-side token re-verification in the `/api/leads` proxy, config-gated on `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` (secret stays server-side). HTTPS pending production hosting.
- [ ] **NFR-03** — Privacy: publish a Privacy Notice explaining lead data collection, use, retention, consent, and contact details.
  - *Acceptance:* Every form/chat lead flow captures consent and links to the notice. See [[Page - Privacy Notice and Terms]].
- [ ] **NFR-04** — Accessibility: readable contrast, keyboard navigation, alt text, clear form labels, captions/subtitles for testimonial videos where practical.
  - *Acceptance:* Core content and conversion path are usable without a mouse and understandable with assistive technologies.
- [ ] **NFR-05** — Browser support: latest Chrome, Safari, Edge, Firefox; Android and iOS mobile browsers.
  - *Acceptance:* Developer tests primary user flows in the listed browsers.
- [ ] **NFR-06** — Admin ownership: Solar Works retains ownership of domain, hosting, CMS administrator account, analytics, Meta Pixel, chatbot account, and Google Sheet.
  - *Acceptance:* All accounts are registered to Solar Works-controlled emails and documented at handover.
- [ ] **NFR-07** — Backup and recovery: website backup and documented restoration process.
  - *Acceptance:* Developer documents backup frequency, storage location, and restoration steps.
- [ ] **NFR-08** — Content environment: staging / preview process before production publishing.
  - *Acceptance:* Solar Works can review content and major updates before public release.

## Related

- [[Global Requirements]]
- [[Integration - Google Sheets Lead Database]]
- [[MOC - NFRs]]
