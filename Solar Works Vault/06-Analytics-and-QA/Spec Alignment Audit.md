---
title: Spec Alignment Audit
type: qa
tags: [solar-works, website, qa, audit]
source: "Website Functional Specifications v1.0"
audit_date: 2026-07-01
---

# Spec ↔ Build Alignment Audit

Section-by-section check of the vault and the current build against **Website Functional Specifications v1.0 (22 June 2026)**. Audited 2026-07-01.

> [!success] Verdict
> The vault is a **complete and faithful transcription** of the functional spec — every section, requirement ID, page, field, and appendix is represented. No spec feature is missing from the documentation.

## Coverage Map

| PDF Section | Vault Note(s) | Status |
| --- | --- | --- |
| §1 Purpose / Success / Out-of-scope | [[Project Summary]], [[Project Scope]] | ✓ |
| §2 Target Audiences (4) | `Audience -` notes ×4 | ✓ |
| §3 Sitemap (9 pages) | [[MOC - Pages and Features]] + 9 page notes | ✓ |
| §4 Global Requirements **G-01–G-08** | [[Global Requirements]] | ✓ |
| §5 Home Page + Appendix A copy | [[Page - Home]] | ✓ |
| §6 Testimonial/Project Library **T-01–T-05** | [[Page - Customer Stories]] (T-01/02/03/05), [[Page - Our Work and Projects]] (T-04) | ✓ |
| §7 Lead Form (15 fields + **L-01–L-05**) | [[Lead Capture Form]] | ✓ |
| §8 AI Chatbot (flow 1–9, guardrails) + Appendix B | [[Integration - AI Lead Chatbot]] | ✓ |
| §9 Lead DB (4 tabs + integration logic) | [[Integration - Google Sheets Lead Database]] | ✓ |
| §10 Standard Content Pages (incl. Solar Carport) | page notes | ✓ |
| §11 **NFR-01–NFR-08** | [[Non-Functional Requirements]] | ✓ |
| §12 Analytics events | [[Analytics and Conversion Events]] | ✓ |
| §13 Developer Deliverables | [[Developer Deliverables]] | ✓ |
| §14 UAT Checklist | [[Pre-Launch QA Checklist]] | ✓ |
| §15 Decisions Required | [[Solar Works Website - Home]] hub + [[Solar Works - Website Production Build Guide]] | ✓ |

## Open Items (not documentation gaps — build/decision items)

1. **Lead database — intentional deviation from spec.** Spec §9 mandates Google Sheets; the build uses a **MongoDB collection in `solarworks-platform`** with email notifications via Resend. Satisfies the spec's intent (central DB, auto Lead ID/status, consent gate, no public access, server-side credentials). A one-way **export/mirror to Google Sheets** remains an open option, not yet built. Documented in [[Integration - Google Sheets Lead Database]]. → **Needs client sign-off.**
2. **AI chatbot is implemented (corrected 2026-07-01).** Built as a real **Groq-powered Solar Assistant** (`app/api/chat/route.ts` + `chat-launcher.tsx`), config-gated on `GROQ_API_KEY` — it falls back to form/Viber until the key is set. The provider decision is effectively made (Groq); what remains is supplying the key, not building the feature. (Supersedes the earlier "mock launcher" note.)
3. **Not published online.** Everything runs on the development machine; HTTPS / production hosting (NFR-02, NFR-05) pending deployment.

## Related

- [[Developer Deliverables]]
- [[Pre-Launch QA Checklist]]
- [[Integration - Google Sheets Lead Database]]
- [[MOC - Analytics and QA]]
