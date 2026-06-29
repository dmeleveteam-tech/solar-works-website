---
title: Solar Works Website Production Build Guide
tags:
  - project/solar-works
  - type/build-spec
  - status/in-progress
created: 2026-06-29
version: 1.0
---

# Solar Works Website Production Build Guide

## Table of Contents

- [[#Project Summary]]
- [[#Information Architecture and Sitemap]]
- [[#Page-by-Page Build Specifications]]
  - [[#Home Page]]
  - [[#Why Solar Works]]
  - [[#Solar Solutions]]
  - [[#Our Work and Projects]]
  - [[#Customer Stories]]
  - [[#Solar Learning Center and FAQs]]
  - [[#About Us]]
  - [[#Contact Us]]
  - [[#Privacy Notice and Terms of Use]]
- [[#Global Requirements]]
- [[#Lead Capture Form]]
  - [[#Form Field Specifications]]
  - [[#Submission and Integration Requirements]]
- [[#AI Lead Chatbot]]
  - [[#Placement and Entry Points]]
  - [[#Core Conversation Flow]]
  - [[#Guardrails and Answering Policy]]
- [[#Google Sheets Integration]]
  - [[#Database Schema]]
  - [[#Integration and Security Logic]]
- [[#Analytics and Conversion Events]]
- [[#Non-Functional Requirements]]
- [[#Developer Deliverables]]
- [[#Pre-Launch QA Checklist]]

---

> [!todo] Open Questions Before Build Starts
> - Confirm the final website domain and preferred hosting / CMS platform.
> - Establish approved Solar Works contact channels: phone, Viber, WhatsApp, email, Facebook, Instagram.
> - Identify the designated Google Workspace / Google account owner and the target Google Sheet.
> - Choose the preferred chatbot platform and budget (or determine if the developer will recommend one).
> - Define the sales notification recipient(s) and target response-time standard.
> - Provide the initial testimonial videos, written quotes, client consent records, and project photos.
> - Confirm the final service coverage areas and approved warranty language.
> - Identify the named Solar Works content administrator(s) for post-launch updates.

---

## Project Summary

The Solar Works website shall establish Solar Works as a trusted, high-quality solar installation partner for residential and selected commercial clients. The website must build confidence through real customer proof, explain the value of a properly designed solar system, and convert qualified visitors into actionable leads. Project completion is defined by the launch of a responsive, premium website where visitors can watch optimized customer videos and easily submit inquiries via a secure lead capture form or an AI-enabled chatbot, with all lead details (including UTM parameters and consent) reliably saved to a Google Sheets database, triggering immediate email notifications for the sales team.

### Target Audiences

| Audience | Primary Need | Website Message |
| --- | --- | --- |
| Residential homeowners | Lower bills, backup power, confidence that the investment is right | Solar designed for your home, your consumption, and your future needs. |
| Premium / upper-middle-income homeowners | Reliable workmanship, long-term quality, peace of mind | Get your solar right the first time. |
| Farm, resort, school, and SME owners | Lower operating cost and stronger energy resilience | A solar solution engineered around your operational needs. |
| Referral prospects | Proof that Solar Works is dependable | Trusted by homeowners and businesses who have experienced the work firsthand. |

> [!caution] Out of Scope (Phase 1)
> - Online checkout / e-commerce payment flow.
> - Automatic final quotations or binding savings promises.
> - Customer portal, monitoring dashboard, or service-ticketing portal.
> - Full CRM replacement; Google Sheets is the initial lead database.

---

## Information Architecture and Sitemap

- `Home` — testimonial-first landing page
- `Why Solar Works` — value proposition, process, warranties, after-sales support
- `Solar Solutions` — Grid-Tied, Hybrid with Battery, Commercial / Farm / Carport
- `Our Work / Projects` — project gallery and case studies
- `Customer Stories` — video and written testimonial library
- `Solar Learning Center / FAQs` — education and objection handling
- `About Us` — team, credentials, mission, service areas
- `Contact Us / Get a Solar Assessment` — form, chatbot, contact channels
- `Privacy Notice and Terms of Use`

---

## Page-by-Page Build Specifications

### Home Page

The home page is the primary facade of the brand. The hierarchy must lead with proof, not with equipment specs. The visitor should feel: "These people are credible, their clients are real, and they will do this properly."

| Section | Purpose | Content / Function | Primary CTA |
| --- | --- | --- | --- |
| Hero | Immediate trust + conversion | Headline around "Solar that works." Supporting copy on personalized system design, industry-best warranties, and lifetime support. Include one strong project / homeowner visual or short muted video. | Get a Free Solar Assessment |
| Featured Customer Proof | Make testimonials the first major proof point | Display 1–3 featured video testimonials above the fold or immediately after hero. Each card includes client name, location (optional), system type, short outcome, play button. | Watch Customer Stories |
| Trust Markers | Reduce perceived risk | Show concise proof points: 20-year panel warranty, 10-year battery warranty, lifetime after-sales support while products are under warranty, experienced engineering / installation team, clean workmanship. | Why Solar Works |
| How It Works | Make the buying journey simple | Four-step visual: Share your bill / consumption → Site and roof assessment → System design + proposal → Professional installation + support. | Start Your Assessment |
| Solutions | Help visitors self-identify | Cards for Grid-Tied, Hybrid with Battery, Commercial / Farm / Carport. Each card leads to a detail page or pre-fills lead intent. | Explore Solutions |
| Featured Projects | Show capability and workmanship | Project gallery with before/after or completed installation photos; include location, system category, installed capacity, and a short client outcome when permitted. | View Our Work |
| Written Testimonials | Build volume and social proof | Carousel or grid of client quotes with name, location, installation type, and optional profile photo. Must be manually curated. | Read More Stories |
| FAQ Preview | Handle buyer objections | Top 5 questions: cost, savings, warranties, battery need, installation timeline. | View FAQs |
| Final Conversion Block | Last chance to capture intent | Clear CTA offering solar assessment. Present two choices: "Fill out a quick form" and "Chat with our Solar Assistant." | Get Assessed |

> [!note] Recommended Homepage Copy Direction
> - **Hero Headline:** Solar that works. Built around your life.
> - **Supporting Line:** From personalized system design to professional installation and long-term support, Solar Works helps you make the shift to clean energy with confidence.
> - **Primary CTA:** Get Your Free Solar Assessment
> - **Secondary CTA:** Hear From Our Customers
> - **Proof Strip:** 20-Year Panel Warranty | 10-Year Battery Warranty | Lifetime After-Sales Support While Products Are Under Warranty

---

### Why Solar Works

- **Purpose:** Articulate why clients should trust Solar Works.
- **Recommended Sections:** Personalized design; quality components; warranties; clean installation; after-sales support; customer proof; process.
- **Conversion Mechanism:** Assessment CTA + chatbot.

---

### Solar Solutions

- **Purpose:** Explain solution options without overcomplicating.
- **Recommended Sections:** Grid-Tied; Hybrid with Battery; Commercial / Farm; Solar Carport; who each is for; FAQs.
- **Conversion Mechanism:** Solution-specific assessment CTA.

---

### Our Work and Projects

- **Purpose:** Show capability and workmanship.
- **Recommended Sections:** Filterable gallery; project details; capacity; client story; photo evidence.
- **Conversion Mechanism:** Request similar assessment.

#### Build Requirements

- [ ] **T-04** — Projects gallery shall support multiple images, category, capacity (kW), battery capacity (kWh, if applicable), location, short scope, and featured flag. (Acceptance: Featured projects can be surfaced automatically on Home page.)

---

### Customer Stories

- **Purpose:** Deepen social proof.
- **Recommended Sections:** Video library; written reviews; category filters; clear consent-based presentation.
- **Conversion Mechanism:** Talk to a Solar Adviser.

#### Build Requirements

- [ ] **T-01** — Create a dedicated Customer Stories page with filterable testimonial cards. (Acceptance: Visitor can browse by Residential / Commercial / Farm, Grid-Tied / Hybrid, and video / written format.)
- [ ] **T-02** — Each video testimonial entry shall support: thumbnail, video URL/embed, client name, location (optional), project type, headline outcome, short summary, publish status, and sort order. (Acceptance: Admin can create and publish a testimonial; it displays correctly on Home and Customer Stories pages.)
- [ ] **T-03** — Written testimonial entry shall support: quote, client name, location (optional), project type, client photo (optional), consent status, publish status, and sort order. (Acceptance: Only approved testimonials are public; unpublished items are not publicly accessible.)
- [ ] **T-05** — No unverified energy-savings claim shall be displayed as a guarantee. Use actual case-study figures only where source data and client consent exist. (Acceptance: Content editor can add disclaimers or omit savings claims; developer does not hard-code performance promises.)

---

### Solar Learning Center and FAQs

- **Purpose:** Improve organic discovery and buyer confidence.
- **Recommended Sections:** FAQs, explainers, buying guides, warranties, solar myths, basic bill / kWh education.
- **Conversion Mechanism:** Download / assessment CTA.

---

### About Us

- **Purpose:** Make the company human and credible.
- **Recommended Sections:** Mission, team, engineering experience, values, geographic coverage, social links.
- **Conversion Mechanism:** Contact / chat.

---

### Contact Us

- **Purpose:** Give all contact pathways.
- **Recommended Sections:** Form, chatbot, phone, Viber/WhatsApp, email, office/service areas, social pages.
- **Conversion Mechanism:** Submit inquiry.

---

### Privacy Notice and Terms of Use

- **Purpose:** Legal and compliance.
- **Recommended Sections:** Lead data collection, use, retention, consent, and contact details.

---

## Global Requirements

- [ ] **G-01** — Responsive design for mobile, tablet, and desktop. Mobile is a first-class experience because paid and social traffic will likely be mobile-heavy. (Acceptance: Layouts, forms, testimonial videos, menus, and chatbot work cleanly at common mobile widths.)
- [ ] **G-02** — Persistent primary CTA: "Get Your Free Solar Assessment" with direct access to form or chatbot. (Acceptance: CTA is visible in hero, throughout key sections, and in the sticky mobile action area.)
- [ ] **G-03** — Persistent contact actions: Call, Viber / WhatsApp as applicable, Facebook / Instagram, and email. (Acceptance: Each action uses the relevant direct link and opens correctly on mobile and desktop.)
- [ ] **G-04** — Site-wide navigation and footer. (Acceptance: All published pages are reachable from header or footer navigation; footer includes privacy notice and contact details.)
- [ ] **G-05** — Basic SEO controls: editable page title, meta description, Open Graph image, page slug, image alt text, and schema-ready content. (Acceptance: Developer provides CMS fields or documented editable areas for each item.)
- [ ] **G-06** — Analytics instrumentation using GA4 and Meta Pixel, with tracked conversion events. (Acceptance: Events are fired for form start, form submission, chatbot start, chatbot qualified lead, phone click, Viber/WhatsApp click, and testimonial video play.)
- [ ] **G-07** — Fast, clean media delivery. Testimonial videos must not materially slow page load. (Acceptance: Videos use optimized embedded hosting / lazy loading and page performance remains acceptable on mobile data.)
- [ ] **G-08** — Content Management capability for testimonials, projects, FAQs, and blog / learning articles. (Acceptance: Admin can add, edit, reorder, publish/unpublish without developer intervention.)

---

## Lead Capture Form

### Form Field Specifications

| Field | Required | Input Type | Notes / Validation | Google Sheet Column |
| --- | --- | --- | --- | --- |
| `Full Name` | Yes | Text | Minimum 2 words preferred; trim spaces. | `Full Name` |
| `Mobile Number` | Yes | Tel | Philippine mobile validation; accept `+63` or `09` format. | `Mobile Number` |
| `Email Address` | No | Email | Validate format. | `Email` |
| `Installation Address` | Yes | Text + structured locality fields | At minimum: Barangay / City-Municipality / Province. Full street address optional initially. | `Address` |
| `Property Type` | Yes | Dropdown | Home / Farm / Resort / School / Office / Commercial / Other. | `Property Type` |
| `Average Monthly Electricity Bill` | Preferred | Currency | Allow PHP estimate when kWh is unknown. | `Monthly Bill (PHP)` |
| `Average Monthly Consumption (kWh)` | Preferred | Number | At least one of bill or kWh should be collected. | `Monthly kWh` |
| `Preferred Solution` | No | Dropdown | Grid-Tied / Hybrid with Battery / Not Sure Yet / Commercial Solar. | `Solution Interest` |
| `Primary Goal` | No | Multi-select | Lower bill / Backup power / Both / Business operating cost / Sustainability. | `Primary Goal` |
| `Electricity Provider` | No | Dropdown + Other | Examples: Meralco, BATELEC, VECO, Davao Light, Other. | `Utility Provider` |
| `Roof / Site Notes` | No | Text area | Example: roof type, available space, property stage, special requirements. | `Site Notes` |
| `How did you hear about us?` | No | Dropdown | Referral / Facebook / Instagram / Google / Existing client / Event / Other. | `Lead Source Detail` |
| `Preferred Contact Method` | Yes | Radio | Call / Viber / WhatsApp / Email. | `Preferred Contact Method` |
| `Consent Checkbox` | Yes | Checkbox | Consent to Solar Works contacting the visitor and storing information for assessment purposes. Link to Privacy Notice. | `Consent Status` |

### Submission and Integration Requirements

- [ ] **L-01** — Form shall submit lead data to the designated Google Sheets Lead Database. (Acceptance: Successful submission creates exactly one new row with timestamp and source metadata.)
- [ ] **L-02** — Form shall display a confirmation state after successful submission. (Acceptance: Confirmation thanks the visitor, confirms follow-up, and offers Viber/WhatsApp shortcut.)
- [ ] **L-03** — Form shall prevent duplicate accidental submissions. (Acceptance: Submit button disables while request is processing; duplicate detection checks mobile number + recent time window where feasible.)
- [ ] **L-04** — Capture UTM fields and landing-page URL when available. (Acceptance: Google Sheet row contains `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and landing page.)
- [ ] **L-05** — If data connection or integration fails, form shall show a safe error message and retain entered fields where technically feasible. (Acceptance: No false success message is shown when row creation fails; failure is logged for developer/admin review.)

---

## AI Lead Chatbot

### Placement and Entry Points

- Floating chatbot launcher visible across all main public pages.
- Prominent "Chat with our Solar Assistant" CTA on the Home page, Solutions pages, Customer Stories page, and Final Conversion block.
- Chatbot must support contextual initialization — e.g., if launched from the Hybrid Solutions page, automatically set `Solution Interest` = `Hybrid with Battery`.

### Core Conversation Flow

> [!note] Suggested Opening Script
> "Hi, I'm the Solar Works Solar Assistant. I can help you understand which solar setup may fit your home or business, then connect you with our team for a proper assessment. Would you like to get an assessment, or do you have a question first?"

| Step | Required Bot Behavior |
| --- | --- |
| 1. Welcome | Greet the visitor, state that the assistant can help assess solar needs, and offer two paths: "Get a solar assessment" or "Ask a question." |
| 2. Intent / qualification | Ask whether the property is a home, farm, business, resort, school, or another property type. |
| 3. Location | Collect installation location: Barangay, City / Municipality, Province. Explain that this is used to confirm serviceability and prepare the assessment. |
| 4. Energy use | Ask for average monthly kWh. If unknown, ask for average monthly electricity bill in PHP. The bot should accept either and label it clearly as estimated if the user is unsure. |
| 5. Solution need | Ask whether the client mainly wants lower bills, backup power during outages, or both. |
| 6. Contact details | Collect full name, mobile number, optional email, and preferred contact method. |
| 7. Consent | Present brief privacy / contact consent language and require an affirmative response before saving a lead. |
| 8. Save and handoff | Create Google Sheet record, assign `Lead Status` = `New`, show confirmation, and provide next-step expectation: Solar Works will review consumption and schedule a discussion / site assessment. |
| 9. Human escalation | At any point, offer a direct link or handoff to Viber / WhatsApp / contact number for clients who prefer immediate human assistance. |

### Guardrails and Answering Policy

> [!warning] Guardrail
> - The bot must identify itself clearly as an AI assistant and must not imply it is a licensed engineer or a human employee.
> - The bot must not provide binding quotations, guaranteed savings, definitive roof suitability, or final system sizing without review by Solar Works.
> - When asked for price, the bot should explain that pricing depends on consumption, site conditions, roof, and battery requirements, then steer toward lead capture or a human discussion.
> - For questions outside the approved knowledge base, the bot shall state that a Solar Works adviser will confirm and offer to collect the visitor's details.
> - The bot may explain the difference between grid-tied and hybrid systems in simple, approved language.
> - Conversation transcript / summary should be saved or linked in the lead record where the chosen platform supports it.

---

## Google Sheets Integration

### Database Schema

| Tab | Purpose | Minimum Required Columns |
| --- | --- | --- |
| `Leads` | Master intake database for form and chatbot leads | `Lead ID`, `Created At`, `Channel`, `Lead Status`, `Full Name`, `Mobile`, `Email`, `Address`, `Property Type`, `Monthly Bill (PHP)`, `Monthly kWh`, `Solution Interest`, `Primary Goal`, `Utility Provider`, `Site Notes`, `Preferred Contact Method`, `Consent Status`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `landing_page`, `Chat Transcript/Summary Link`, `Owner`, `Follow-up Date`, `Remarks` |
| `Lead Sources` | Controlled values for channels and campaigns | `Source Name`, `Source Type`, `Active Flag` |
| `Dropdown Lists` | Reference values used by integration and team | `Property Type`, `Solution Interest`, `Lead Status`, `Owner`, `Utility Provider` |
| `Error Log` | Optional but recommended integration log | `Timestamp`, `Source`, `Error Type`, `Payload Reference`, `Resolution Status` |

### Integration and Security Logic

- **Lead ID format:** `SW-YYYYMMDD-####` (or equivalent sequential pattern).
- **Auto-set on creation:** `Channel` = `Website Form` or `Website Chatbot`; `Lead Status` = `New`.
- **Sales notifications:** Send an immediate notification to a designated email, Google Chat, Slack, or Viber-compatible workflow. Email notification is the minimum required.
- **Consent gate:** Notify only after consent is recorded. Partial / abandoned chats may be stored separately only if compliant with the selected privacy approach.
- **Credential security:** Implement via a secure backend service, Make / Zapier / n8n, Google Apps Script Web App, or chatbot native integration. Never expose Google credentials or API keys in browser-side code.
- **Access control:** Prevent direct public access to the Google Sheet; only authorized Solar Works users and the integration service account may access it.

---

## Analytics and Conversion Events

| Event Name | Trigger | Business Use |
| --- | --- | --- |
| `testimonial_video_play` | Visitor plays any testimonial video | Measure whether proof content engages visitors. |
| `lead_form_start` | Visitor begins the assessment form | Identify form friction and intent volume. |
| `lead_form_submit` | A form lead is successfully saved | Primary conversion event for ad attribution. |
| `chatbot_open` | Visitor opens the Solar Assistant | Measure conversational lead intent. |
| `chatbot_qualified_lead` | Chatbot saves a consented lead | Primary chatbot conversion event. |
| `phone_click` | Visitor taps / clicks the phone contact link | Measure high-intent direct contact behavior. |
| `viber_click` | Visitor taps / clicks the Viber link | Measure high-intent direct contact behavior. |
| `whatsapp_click` | Visitor taps / clicks the WhatsApp link | Measure high-intent direct contact behavior. |
| `project_view` | Visitor opens a project detail page | Understand content most associated with conversion. |
| `solution_view` | Visitor opens a solution detail page | Understand content most associated with conversion. |

---

## Non-Functional Requirements

- [ ] **NFR-01** — Performance: optimize for fast mobile loading; compress images; lazy-load media; avoid autoplay with sound. (Acceptance: Key public pages load without excessive blocking media; videos are deferred / lazy-loaded.)
- [ ] **NFR-02** — Security: HTTPS, secure form submission, server-side validation, spam prevention (e.g., reCAPTCHA / Turnstile), no exposed secrets. (Acceptance: Security test confirms no API keys or Google credentials are visible in front-end source code.)
- [ ] **NFR-03** — Privacy: publish a Privacy Notice explaining lead data collection, use, retention, consent, and contact details. (Acceptance: Every form/chat lead flow captures consent and links to the notice.)
- [ ] **NFR-04** — Accessibility: readable contrast, keyboard navigation, alt text, clear form labels, captions/subtitles for testimonial videos where practical. (Acceptance: Core content and conversion path are usable without a mouse and understandable with assistive technologies.)
- [ ] **NFR-05** — Browser support: latest Chrome, Safari, Edge, Firefox; Android and iOS mobile browsers. (Acceptance: Developer tests primary user flows in the listed browsers.)
- [ ] **NFR-06** — Admin ownership: Solar Works retains ownership of domain, hosting, CMS administrator account, analytics, Meta Pixel, chatbot account, and Google Sheet. (Acceptance: All accounts are registered to Solar Works-controlled emails and documented at handover.)
- [ ] **NFR-07** — Backup and recovery: website backup and documented restoration process. (Acceptance: Developer documents backup frequency, storage location, and restoration steps.)
- [ ] **NFR-08** — Content environment: staging / preview process before production publishing. (Acceptance: Solar Works can review content and major updates before public release.)

---

## Developer Deliverables

- [ ] Responsive production website with all agreed pages and functional navigation.
- [ ] Testimonial and project content-management capability.
- [ ] Website lead form connected to Google Sheets.
- [ ] AI-enabled chatbot configured with approved Solar Works knowledge, lead-qualification flow, consent logic, and Google Sheets integration.
- [ ] GA4 and Meta Pixel setup with documented conversion events.
- [ ] Google Sheet template / schema with lead notification workflow.
- [ ] Privacy Notice page and consent capture implementation.
- [ ] Admin handover package: credentials inventory, architecture / integration notes, content-editing guide, and basic troubleshooting guide.
- [ ] UAT support and remediation of defects identified against acceptance criteria.

---

## Pre-Launch QA Checklist

- [ ] **QA-01** — A visitor can watch testimonial videos on mobile and desktop without page breakage or intrusive autoplay.
- [ ] **QA-02** — A visitor can submit the form successfully and a complete, correctly labeled row appears in Google Sheets.
- [ ] **QA-03** — A visitor can complete the chatbot qualification flow; the same data is saved to Google Sheets with `Channel` = `Website Chatbot`.
- [ ] **QA-04** — Consent is required before a lead is committed as a contactable lead.
- [ ] **QA-05** — A new lead generates the agreed internal notification.
- [ ] **QA-06** — All CTAs route correctly to form, chatbot, or direct contact options.
- [ ] **QA-07** — UTM parameters are recorded when supplied in the page URL.
- [ ] **QA-08** — Admin can add a new testimonial and feature it on the home page without developer support.
- [ ] **QA-09** — No Google credentials, API keys, or sensitive tokens are exposed in front-end source code.
- [ ] **QA-10** — Analytics events appear in GA4 / platform test environment after execution.
