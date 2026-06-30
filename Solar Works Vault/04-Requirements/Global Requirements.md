---
title: Global Requirements
type: requirements
tags: [solar-works, website, requirements]
source: "Website Functional Specifications v1.0"
---

# Global Requirements

Site-wide requirements that apply across all pages.

- [ ] **G-01** — Responsive design for mobile, tablet, and desktop. Mobile is a first-class experience because paid and social traffic will likely be mobile-heavy.
  - *Acceptance:* Layouts, forms, testimonial videos, menus, and chatbot work cleanly at common mobile widths.
- [ ] **G-02** — Persistent primary CTA: "Get Your Free Solar Assessment" with direct access to form or chatbot.
  - *Acceptance:* CTA is visible in hero, throughout key sections, and in the sticky mobile action area.
- [ ] **G-03** — Persistent contact actions: Call, Viber / WhatsApp as applicable, Facebook / Instagram, and email.
  - *Acceptance:* Each action uses the relevant direct link and opens correctly on mobile and desktop.
- [ ] **G-04** — Site-wide navigation and footer.
  - *Acceptance:* All published pages are reachable from header or footer navigation; footer includes privacy notice and contact details.
- [ ] **G-05** — Basic SEO controls: editable page title, meta description, Open Graph image, page slug, image alt text, and schema-ready content.
  - *Acceptance:* Developer provides CMS fields or documented editable areas for each item.
- [ ] **G-06** — Analytics instrumentation using GA4 and Meta Pixel, with tracked conversion events.
  - *Acceptance:* Events are fired for form start, form submission, chatbot start, chatbot qualified lead, phone click, Viber/WhatsApp click, and testimonial video play. See [[Analytics and Conversion Events]].
- [ ] **G-07** — Fast, clean media delivery. Testimonial videos must not materially slow page load.
  - *Acceptance:* Videos use optimized embedded hosting / lazy loading and page performance remains acceptable on mobile data.
- [ ] **G-08** — Content Management capability for testimonials, projects, FAQs, and blog / learning articles.
  - *Acceptance:* Admin can add, edit, reorder, publish/unpublish without developer intervention.

## Related

- [[Lead Capture Form]]
- [[Non-Functional Requirements]]
- [[Integration - GA4 and Meta Pixel]]
- [[MOC - Requirements]]
