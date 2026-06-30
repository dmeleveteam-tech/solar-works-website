---
title: Developer Deliverables
type: qa
tags: [solar-works, website, deliverables]
source: "Website Functional Specifications v1.0"
---

# Developer Deliverables

- [x] Responsive production website with all agreed pages and functional navigation.
- [x] Testimonial and project content-management capability.
- [x] Website lead form connected to the lead database. *Implemented against the platform lead store (MongoDB) rather than Google Sheets — see [[Integration - Google Sheets Lead Database]]. Live since 2026-06-30.*
- [ ] AI-enabled chatbot configured with approved Solar Works knowledge, lead-qualification flow, consent logic, and lead-database integration. *Mock launcher only; real widget pending a provider decision.*
- [x] GA4 and Meta Pixel setup with documented conversion events. *Implemented 2026-06-30, consent-gated; config-gated on `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID`. See [[Integration - GA4 and Meta Pixel]].*
- [x] Lead notification workflow. *New-lead sales email implemented via Resend (config-gated). Storage is the platform DB, not a Google Sheet template.*
- [x] Privacy Notice page and consent capture implementation. *Form consent + analytics consent banner (accept/decline) both live.*
- [ ] Admin handover package: credentials inventory, architecture / integration notes, content-editing guide, and basic troubleshooting guide.
- [ ] UAT support and remediation of defects identified against acceptance criteria.

## Related

- [[Pre-Launch QA Checklist]]
- [[Global Requirements]]
- [[MOC - Analytics and QA]]
