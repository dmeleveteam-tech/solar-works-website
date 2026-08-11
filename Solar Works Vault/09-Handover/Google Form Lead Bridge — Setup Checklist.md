---
title: Google Form Lead Bridge — Setup Checklist
type: handover
tags: [solar-works, google-form, leads, apps-script, setup]
created: 2026-08-01
status: in-progress
---

# Google Form Lead Bridge — Setup Checklist

Getting *"Solar Works: Customer Info and Requirements Form"* submissions to land
in the platform's Leads inbox. Work top to bottom — the order matters in two
places and both are called out.

No secrets in this file. The ingest key lives in `.env`, Vercel, and Apps Script
Script Properties only.

> [!abstract] Why this exists
> The Google Form is the **default tab** on the contact page. Its responses go to
> its own spreadsheet and have never reached the platform — no inbox entry, no
> sales email, no follow-up. Code: `google-form/lead-bridge.gs`.

---

## Phase 0 — Decide the ingest key

Apps Script needs `LEADS_INGEST_KEY` as plaintext. Vercel stores it as a
**sensitive** variable, which is write-only — it cannot be read back, in the CLI
or the dashboard. So there is no way to confirm the local `.env` value matches
production without rotating.

- [ ] **Option A — reuse:** take `LEADS_INGEST_KEY` from `solarworks-platform/.env`.
      Fast. Silently 401s if local and production have drifted.
- [ ] **Option B — rotate (safer):** generate one value and set it everywhere.
      ```
      node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
      ```
      Then update all four: both `.env` files, both Vercel projects, Apps Script.
      Both Vercel projects need a redeploy to pick it up.

---

## Phase 1 — Push the code (order matters)

> [!warning] Deploy the landing app BEFORE the platform
> The platform now rejects any lead without `consent: true`. The currently-live
> landing site doesn't send it. If the platform deploys first, **every** contact
> form submission fails until the landing deploy catches up. Two pushes, not one.

- [ ] Commit and push **landing only** — `solarworks-landingpage/**`
      (consent checkbox on the Quick Inquiry form, `consent` sent by both forms,
      server-side consent check in its `/api/leads` proxy).
- [ ] Wait for `solar-works-website` to finish deploying →
      https://vercel.com/dm-eleve/solar-works-website/deployments
- [ ] Commit and push **platform + docs** — everything else
      (`consent: z.literal(true)` in the ingest schema, the `SW-` Lead ID,
      `google-form/`, vault docs).
- [ ] Wait for `solar-works-admin` →
      https://vercel.com/dm-eleve/solar-works-admin/deployments
- [ ] Smoke-test the **native** form (Quick Inquiry tab) before touching the
      Google Form. It should still create a lead.

---

## Phase 2 — We create our own Form

> [!danger] The original Form isn't ours
> Checked 2026-08-01: **none** of the signed-in Google accounts owns
> *"Solar Works: Customer Info and Requirements Form"* — verified across every
> account index in both Forms home and Drive (Forms filter, zero results). Apps
> Script can only attach to a Form you can **edit**, so that Form can't be
> bridged until its owner shares it as an Editor.
>
> `createForm()` builds our own replacement instead. Existing responses stay in
> the old Form — nothing is migrated.

Nothing to do by hand here; Phase 3 creates it. Note the consequences:

- [ ] Accept that old responses stay behind, or chase edit access on the original
      and bind the script to that Form instead (skip `createForm` —
      `targetForm()` handles both).
- [ ] The contact page must be repointed at the new Form (Phase 3, step 5).

---

## Phase 3 — Install the script and create the Form ✅ DONE 2026-08-01

> [!success] The Form exists and the bridge is wired
> Owner: `dmeleve.team@gmail.com`. `checkSetup` passes — 11 questions, trigger
> installed, no unmapped questions.
>
> | | |
> | --- | --- |
> | Public (embed) | `https://docs.google.com/forms/d/e/1FAIpQLSfiwCR-yK7djNaPJ7BbhfhXJlCyb399237QWWFFFJFpa1DV6w/viewform` |
> | Form ID | `1wlE9MW16UH3g7I6X-Vr-ZxprXgznnsbKkpqozuEZ8Ng` |
> | Script ID | `1fB2uO6qC03AwJV3sdyAuBxGeyrrFeCI469wgkTS6ucZV9irBiuVGBh_-` |
>
> The Apps Script project is named **lead-bridge**. Two stray "Untitled project"
> scripts sit beside it in the same account from earlier attempts — delete them
> so nobody edits the wrong one.

- [x] https://script.google.com/home → **New project**, signed in as the account
      that should **own** the Form (i.e. `dmeleve.team@gmail.com`, not a personal one)
- [x] Delete the stub contents of `Code.gs`, paste in all of
      `google-form/lead-bridge.gs`, **Save**
- [x] **Project Settings** (⚙ left sidebar) → **Script Properties** → **Add**:

| Property | Value |
| --- | --- |
| `INGEST_URL` | `https://solar-works-admin.vercel.app/api/leads` |
| `INGEST_KEY` | the value from Phase 0 |

> [!note] Must be a public HTTPS URL
> Apps Script runs on Google's servers. `http://localhost:3001` will never work.
> To test against local dev, tunnel it: `cloudflared tunnel --url http://localhost:3001`

- [x] Pick **`createForm`** in the function dropdown → **Run**
- [x] Authorise when prompted. The "Google hasn't verified this app" warning is
      expected for your own script → **Advanced → Go to project (unsafe)**.
      It doesn't always appear; if Google goes straight to the permissions list,
      just **Allow**. Until this is done the script has never run at all — no
      Form, no trigger, and an empty Executions tab with nothing to diagnose.
- [x] Copy the **PUBLIC** URL from the execution log
- [x] Paste it into `solarworks-landingpage/components/google-form-embed.tsx` —
      `GOOGLE_FORM_URL` (keep `?embedded=true`) and `GOOGLE_FORM_LINK`
- [ ] Commit and push the landing app so the contact page serves the new Form
- [x] Run **`checkSetup`**. It fails loudly on a missing Script Property, a
      missing consent question, or a missing trigger, and lists any Form question
      with no explicit mapping.

---

## Phase 3.4 — Cut the Form to four questions (the `updateForm` migration)

The Messenger bot's qualification is now four questions. The Form has to match,
or a Form lead and a Messenger lead read differently in the same inbox.

**New question set** — exactly these, in this order, nothing else:

| # | Question | Type |
| --- | --- | --- |
| 1 | Full Name | short text, required |
| 2 | Mobile Number | short text, required (renamed from *Primary Contact Phone Number*) |
| 3 | What is your monthly electricity bill range in the last 6 months? | multiple choice, required |
| 4 | What is your daytime vs nighttime electricity usage? | multiple choice, required |
| 5 | What do you want solar to do for your electricity bill? | multiple choice, required — **new** |
| 6 | *the consent question* | Yes/No, required, always last |

Options for 3–5 are copied verbatim from `MONTHLY_BILL_RANGES`, `USAGE_PATTERNS`
and `PRIMARY_GOALS` in `solarworks-platform/lib/chat/vocab.ts`. **Removed:**
correspondence email, installation address, property type, battery interest,
best time to contact, urgency rating, and the (already-disabled) bill upload.

> [!danger] Export the responses BEFORE running `updateForm`
> Deleting a question from a live Google Form does **not** delete the answers
> already collected — they stay in the linked response sheet. But the column
> **stops being written** and the Forms summary drops the question, so from the
> Forms UI the history looks gone even though it isn't. Form → **Responses** →
> green Sheets icon, or **⋮ → Download responses (.csv)**. There is no undo.

> [!warning] `createForm` is NOT the migration path
> It refuses to run once `FORM_ID` is set, on purpose — a second run would
> orphan a Form that is already collecting responses. `updateForm()` migrates
> the live Form in place, and is safe to re-run (every step checks the current
> state first).

- [ ] Export the existing responses and keep the file somewhere the team can find
- [ ] Paste the updated `google-form/lead-bridge.gs` into the `lead-bridge` Apps
      Script project, **Save** (the copy in Google is a *paste*, not a checkout)
- [ ] Pick **`updateForm`** → **Run**, and read the execution log: it says what
      it renamed, what options it rewrote, what it added, what it deleted and
      what it skipped
- [ ] Confirm the log ends with `CONSENT untouched and still present`
- [ ] If the log warns about the question **order**, drag the questions into place
      in the Forms UI — drag, never delete-and-re-add
- [ ] Run **`checkSetup`** again — 6 questions, no unmapped, no missing, no
      option drift
- [ ] Submit once and check the lead in the inbox carries `Monthly bill (PHP)`,
      `Daytime vs nighttime usage` and `Primary goal`

> [!note] `updateForm` will never touch the consent question
> It refuses to start if the question is missing, skips it explicitly in the
> rename and delete passes, and re-verifies it before reporting success. An
> accidental deletion would silently skip every future submission.

---

## Phase 3.5 — Label the channel (order matters)

First submission proved the bridge works but showed **"Website Form"** in the
inbox, because the script sent `source: 'website_form'` — the only public source
that existed. There is now a `google_form` source labelled **"Google Form"**.

> [!warning] Platform first, Apps Script second
> `PUBLIC_SOURCES` is a `z.enum`. If the script starts sending `google_form`
> before the platform that accepts it is live, **every submission 422s**. Deploy,
> then edit the script — never the other way round.

- [x] `google_form` added to `LEAD_SOURCES` + `SOURCE_LABEL` (`lib/leads-shared.ts`)
      and `PUBLIC_SOURCES` (`app/api/leads/route.ts`)
- [x] `google-form/lead-bridge.gs` sends `source: 'google_form'`
- [ ] **After** `solar-works-admin` finishes deploying: open the `lead-bridge`
      Apps Script project and paste in the updated `lead-bridge.gs`, **Save**.
      The copy running in Google is a *paste*, not a checkout — a repo push does
      not update it.
- [ ] Submit once more; the lead should read **Google Form**

---

## Phase 4 — End-to-end test

- [ ] Submit the Google Form yourself, consent ticked, with a real-looking name
      and phone number
- [ ] Lead appears at https://solar-works-admin.vercel.app/dashboard within
      seconds, with a `SW-YYYYMMDD-####` reference
- [ ] Sales alert email arrives (whatever `LEADS_NOTIFY_TO` is set to)
- [ ] Submit again with consent **unticked** → **no** lead is created
- [ ] Apps Script **Executions** tab shows both runs — the second logs a skip
      warning naming the consent question

---

## Phase 5 — Watch it

- [ ] Apps Script **Executions**: https://script.google.com/home/executions —
      a failed POST throws, and Google emails the script owner. That email is the
      **only** alerting this bridge has.
- [ ] Vercel runtime logs for the platform:
      https://vercel.com/dm-eleve/solar-works-admin/logs

---

## Field mapping reference

Full table in `google-form/README.md`. Current mapping:

| Form question | Lands as |
| --- | --- |
| Full Name | `name` |
| Mobile Number | `phone` |
| Bill range | detail `Monthly bill (PHP)` |
| Daytime vs nighttime usage | detail `Daytime vs nighttime usage` |
| Electricity goal | detail `Primary goal` |

Traps worth repeating:

- **Options are data, not copy.** They're matched against `vocab.ts` downstream,
  so a difference of one peso sign or a hyphen-instead-of-en-dash puts two
  spellings of the same answer in the inbox. `checkSetup` warns on drift.
- **`Daytime vs nighttime usage`** is unanimous across all three channels as of
  2026-08-11. The chat brain used to write `Daytime vs night use`; it was moved
  to match the two that already agreed. Changing the spelling anywhere now means
  changing it in the Form bridge, the native site form and the platform's
  `vocab.ts` together, or the inbox splits one question across two headings.
- **Question titles must match the Form exactly.** They do by construction —
  `createForm`/`updateForm` build the questions from the same `Q` constants
  `QUESTION_MAP` is keyed on — so reword a question in the Forms UI and you must
  edit `Q` too.
  (The original Form misspelled "electicity"; ours spells it correctly, which is
  why the titles aren't byte-identical to the old one.) An unmapped question
  still comes through, keyed by its own title, so adding one never silently
  loses data.

## Known gaps for this channel

- **No email and no address on the lead.** The four-question set drops both. The
  adviser gets them on the call. Nothing downstream hard-fails without them.
- **No UTM attribution.** A Form submission carries no campaign parameters or
  landing page, unlike native-form and chatbot leads.
- **No Turnstile.** Relies on Google's own reCAPTCHA plus the ingest key.

## Related

- [[Integration - Google Sheets Lead Database]]
- [[Lead Capture Form]]
- [[Admin Handover and Go-Live Guide]]
