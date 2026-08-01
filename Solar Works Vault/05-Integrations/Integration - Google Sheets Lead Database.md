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

> [!info] Direction settled (2026-08-01)
> A leads → Sheets **mirror** was built and then **reverted the same day**. It solved the wrong problem: the sales team doesn't need a spreadsheet view of the Mongo inbox — the **Google Form is the client-facing intake**, and its responses were never reaching the platform at all. The work now flows the other way, via [[#Google Form → lead bridge]]. Nothing of the mirror remains in the codebase.
>
> Two things from that effort were kept because they stand on their own: the real **Lead ID** and the **server-side consent gate** (both below).

## Google Form → lead bridge

The contact page's default tab is an embedded Google Form, *"Solar Works: Customer Info and Requirements Form"* (`components/google-form-embed.tsx`). Its responses went to a Google Sheet and **never became leads** — invisible to the dashboard inbox, the sales email, and every follow-up.

The bridge is a Google Apps Script attached to the Form: **`google-form/lead-bridge.gs`** (setup in `google-form/README.md`). On submit it POSTs to the platform's `/api/leads` with the shared ingest key — the same endpoint the native form uses, so a Form lead is indistinguishable downstream and there is no second code path to keep in sync.

Chosen over a service account polling the responses sheet because it fires instantly, needs no Google credentials on our side, and no row-tracking to avoid double-imports.

> [!warning] The Form needs a consent question
> The bridge **skips every submission** until the Form has a required question titled *"I agree to let Solar Works contact me and store my information for assessment purposes."* answered `Yes`. That is deliberate: the platform rejects leads without recorded consent, so stamping `consent: true` on a Form that never asks would manufacture exactly the consent the gate demands. `checkSetup` in the script fails loudly if the question is missing.

> [!note] The urgency scale is inverted between the two forms
> The Google Form rates urgency **5 = ASAP**; the native form rates it **1 = ASAP**. Same inbox, opposite polarity. `formatUrgency` never sends the bare number — it writes `4 of 5 (5 = ASAP, 1 = in 6-12 months)`. Change `URGENCY_NOTE` if the Form's scale ever changes.

Known gaps for this channel: no UTM attribution (a Form submission carries none), and no Turnstile — it relies on Google's own reCAPTCHA plus the ingest key.

### Kept from the reverted work

- **Lead ID is now real**: `SW-YYYYMMDD-####`, assigned at capture from an atomic per-day counter (`lib/lead-ref.ts`), stored on the lead document, included in the sales email, and searchable in the inbox. The Mongo `_id` remains the primary key; this is the string people say out loud. Leads captured before 2026-08-01 have none.
- **Consent Status** carries a value that was actually recorded, never one inferred from the channel — see the consent-gate callout below.

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
> [!important] Consent gate closed server-side (2026-08-01)
> Previously the consent checkbox was validated **only in the browser**, and the "Quick Inquiry" form (`native-inquiry-form.tsx`) had no consent checkbox at all — anything posting straight to `/api/leads` bypassed the gate entirely. Now:
> - Both marketing forms have the checkbox and send `consent: true`.
> - The landing proxy (`landingpage/app/api/leads/route.ts`) rejects `consent !== true` with 422 and records the `Consent` detail it verified.
> - The platform ingest endpoint restates the rule at the write: `consent: z.literal(true)` in `ingestSchema`. Absent / `false` / `"true"`-the-string all fail closed.
> - The chatbot already had its own equivalent gate in `save_lead` and is unchanged.
>
> **Deploy the landing app before (or with) the platform.** The platform now rejects a lead without `consent`, so a platform-only deploy would 422 every form submission until the landing app ships the field.

- **Consent gate:** Notify only after consent is recorded. Partial / abandoned chats may be stored separately only if compliant with the selected privacy approach.
- **Credential security:** Implement via a secure backend service, Make / Zapier / n8n, Google Apps Script Web App, or chatbot native integration. **Never expose Google credentials or API keys in browser-side code.**
- **Access control:** Prevent direct public access to the Google Sheet; only authorized Solar Works users and the integration service account may access it.

## Related

- [[Lead Capture Form]]
- [[Integration - AI Lead Chatbot]]
- [[Non-Functional Requirements]]
- [[MOC - Integrations]]
