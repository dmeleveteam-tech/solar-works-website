---
title: Integration - Google Sheets Lead Database
type: integration
tags: [solar-works, website, integration, google-sheets]
source: "Website Functional Specifications v1.0"
---

# Integration — Google Sheets Lead Database

The initial central lead database for both [[Lead Capture Form|form]] and [[Integration - AI Lead Chatbot|chatbot]] leads.

> [!note] Implementation deviation (2026-06-30)
> The central lead database was built as a **MongoDB collection inside `solarworks-platform`**, not a Google Sheet — staff work leads in the back-office Leads inbox instead of a spreadsheet. The schema and security goals below still apply (lead ID/status auto-set, consent gate, no public access, credentials server-side only).
> - **Lead notification** (the spec's minimum-required sales alert) is **implemented as email** via Resend, fired on each new lead — config-gated on `RESEND_API_KEY` / `LEADS_NOTIFY_FROM` / `LEADS_NOTIFY_TO`. Code: `lib/notifications.ts`.
> - A one-way **export/mirror to Google Sheets** (if the sales team still wants a spreadsheet view) remains an open option, not yet built.

## Database Schema

| Tab | Purpose | Minimum Required Columns |
| --- | --- | --- |
| `Leads` | Master intake database for form and chatbot leads | `Lead ID`, `Created At`, `Channel`, `Lead Status`, `Full Name`, `Mobile`, `Email`, `Address`, `Property Type`, `Monthly Bill (PHP)`, `Monthly kWh`, `Solution Interest`, `Primary Goal`, `Utility Provider`, `Site Notes`, `Preferred Contact Method`, `Consent Status`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `landing_page`, `Chat Transcript/Summary Link`, `Owner`, `Follow-up Date`, `Remarks` |
| `Lead Sources` | Controlled values for channels and campaigns | `Source Name`, `Source Type`, `Active Flag` |
| `Dropdown Lists` | Reference values used by integration and team | `Property Type`, `Solution Interest`, `Lead Status`, `Owner`, `Utility Provider` |
| `Error Log` | Optional but recommended integration log | `Timestamp`, `Source`, `Error Type`, `Payload Reference`, `Resolution Status` |

## Integration and Security Logic

- **Lead ID format:** `SW-YYYYMMDD-####` (or equivalent sequential pattern).
- **Auto-set on creation:** `Channel` = `Website Form` or `Website Chatbot`; `Lead Status` = `New`.
- **Sales notifications:** Send an immediate notification to a designated email, Google Chat, Slack, or Viber-compatible workflow. Email notification is the minimum required.
- **Consent gate:** Notify only after consent is recorded. Partial / abandoned chats may be stored separately only if compliant with the selected privacy approach.
- **Credential security:** Implement via a secure backend service, Make / Zapier / n8n, Google Apps Script Web App, or chatbot native integration. **Never expose Google credentials or API keys in browser-side code.**
- **Access control:** Prevent direct public access to the Google Sheet; only authorized Solar Works users and the integration service account may access it.

## Related

- [[Lead Capture Form]]
- [[Integration - AI Lead Chatbot]]
- [[Non-Functional Requirements]]
- [[MOC - Integrations]]
