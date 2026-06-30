---
title: Integration - AI Lead Chatbot
type: integration
tags: [solar-works, website, integration, chatbot]
source: "Website Functional Specifications v1.0"
---

# Integration — AI Lead Chatbot

A conversational lead-capture assistant ("Solar Assistant") that qualifies visitors and saves consented leads to the [[Integration - Google Sheets Lead Database|Google Sheets Lead Database]].

## Placement and Entry Points

- Floating chatbot launcher visible across all main public pages.
- Prominent "Chat with our Solar Assistant" CTA on the [[Page - Home]], [[Page - Solar Solutions|Solutions]] pages, [[Page - Customer Stories]] page, and Final Conversion block.
- Chatbot must support **contextual initialization** — e.g., if launched from the Hybrid Solutions page, automatically set `Solution Interest` = `Hybrid with Battery`.

## Core Conversation Flow

> [!note] Suggested Opening Script
> "Hi, I'm the Solar Works Solar Assistant. I can help you understand which solar setup may fit your home or business, then connect you with our team for a proper assessment. Would you like to get an assessment, or do you have a question first?"

| Step | Required Bot Behavior |
| --- | --- |
| 1. Welcome | Greet the visitor, state that the assistant can help assess solar needs, and offer two paths: "Get a solar assessment" or "Ask a question." |
| 2. Intent / qualification | Ask whether the property is a home, farm, business, resort, school, or another property type. |
| 3. Location | Collect installation location: Barangay, City / Municipality, Province. Explain that this is used to confirm serviceability and prepare the assessment. |
| 4. Energy use | Ask for average monthly kWh. If unknown, ask for average monthly electricity bill in PHP. Accept either; label as estimated if the user is unsure. |
| 5. Solution need | Ask whether the client mainly wants lower bills, backup power during outages, or both. |
| 6. Contact details | Collect full name, mobile number, optional email, and preferred contact method. |
| 7. Consent | Present brief privacy / contact consent language and require an affirmative response before saving a lead. |
| 8. Save and handoff | Create Google Sheet record, assign `Lead Status` = `New`, show confirmation, and provide next-step expectation. |
| 9. Human escalation | At any point, offer a direct link or handoff to Viber / WhatsApp / contact number for clients who prefer immediate human assistance. |

## Guardrails and Answering Policy

> [!warning] Guardrails
> - The bot must identify itself clearly as an AI assistant and must not imply it is a licensed engineer or human employee.
> - The bot must not provide binding quotations, guaranteed savings, definitive roof suitability, or final system sizing without review by Solar Works.
> - When asked for price, explain that pricing depends on consumption, site conditions, roof, and battery requirements, then steer toward lead capture or a human discussion.
> - For questions outside the approved knowledge base, the bot shall state that a Solar Works adviser will confirm and offer to collect the visitor's details.
> - The bot may explain the difference between grid-tied and hybrid systems in simple, approved language.
> - Conversation transcript / summary should be saved or linked in the lead record where the chosen platform supports it.

## Related

- [[Integration - Google Sheets Lead Database]]
- [[Page - Privacy Notice and Terms]]
- [[MOC - Integrations]]
