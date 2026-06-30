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

## Related

- [[Analytics and Conversion Events]]
- [[Global Requirements]]
- [[MOC - Integrations]]
