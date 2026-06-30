---
title: Lead Capture Form
type: requirements
tags: [solar-works, website, requirements, lead-capture]
source: "Website Functional Specifications v1.0"
---

# Lead Capture Form

The primary structured lead-intake mechanism. Submits to the [[Integration - Google Sheets Lead Database|Google Sheets Lead Database]].

## Form Field Specifications

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

## Submission and Integration Requirements

- [ ] **L-01** — Form shall submit lead data to the designated Google Sheets Lead Database.
  - *Acceptance:* Successful submission creates exactly one new row with timestamp and source metadata.
- [ ] **L-02** — Form shall display a confirmation state after successful submission.
  - *Acceptance:* Confirmation thanks the visitor, confirms follow-up, and offers Viber/WhatsApp shortcut.
- [ ] **L-03** — Form shall prevent duplicate accidental submissions.
  - *Acceptance:* Submit button disables while request is processing; duplicate detection checks mobile number + recent time window where feasible.
- [ ] **L-04** — Capture UTM fields and landing-page URL when available.
  - *Acceptance:* Google Sheet row contains `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and landing page.
- [ ] **L-05** — If data connection or integration fails, form shall show a safe error message and retain entered fields where technically feasible.
  - *Acceptance:* No false success message is shown when row creation fails; failure is logged for developer/admin review.

## Related

- [[Integration - Google Sheets Lead Database]]
- [[Page - Contact Us]]
- [[Page - Privacy Notice and Terms]]
- [[MOC - Requirements]]
