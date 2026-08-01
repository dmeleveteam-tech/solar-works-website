# Google Form → lead bridge

Turns submissions of **"Solar Works: Customer Info and Requirements Form"** into
real leads in the platform, so a Google Form lead lands in the dashboard inbox
next to the ones from the native form, the chatbot and Messenger.

`lead-bridge.gs` runs in Google Apps Script. On submit it POSTs to the platform's
`/api/leads` with the shared ingest key — the same endpoint the marketing site
already uses, so the lead gets its `SW-YYYYMMDD-####` reference, the sales email,
the in-app notification and the n8n dispatch with no second code path to
maintain.

## Which Form?

The original *"Solar Works: Customer Info and Requirements Form"* embedded on the
contact page is owned by **an account we don't control** — checked 2026-08-01
across every signed-in account, none owns it. A script can only be attached to a
Form you can edit, so that Form cannot be bridged until someone shares it.

`createForm()` therefore builds **our own** replacement, owned by us, with the
same questions plus the consent question. Two consequences:

- Existing responses stay in the old Form. Nothing is migrated.
- After setup, the contact page must point at the new Form — update
  `GOOGLE_FORM_URL` and `GOOGLE_FORM_LINK` in
  `solarworks-landingpage/components/google-form-embed.tsx` with the public URL
  `createForm` logs.

If the original's owner later grants edit access, bind this same script to that
Form instead and skip `createForm` — `targetForm()` handles both cases.

**Live as of 2026-08-01**, owned by `dmeleve.team@gmail.com`:

| | |
| --- | --- |
| Public (embed) | `https://docs.google.com/forms/d/e/1FAIpQLSfiwCR-yK7djNaPJ7BbhfhXJlCyb399237QWWFFFJFpa1DV6w/viewform` |
| Form ID | `1wlE9MW16UH3g7I6X-Vr-ZxprXgznnsbKkpqozuEZ8Ng` |
| Apps Script project | `lead-bridge`, script id `1fB2uO6qC03AwJV3sdyAuBxGeyrrFeCI469wgkTS6ucZV9irBiuVGBh_-` |

## The consent question

**The bridge skips every submission unless it's answered "Yes".** That is
deliberate, not a bug — the platform rejects any lead without recorded consent,
and the spec gates storage and sales contact on consent being *recorded* rather
than assumed. A Form that never asks cannot produce a lead we're allowed to act
on.

`createForm` adds it automatically, as a required Yes/No question just above
Submit, with the Privacy Notice linked. If you reword the title in the Forms UI,
change `CONSENT_QUESTION` in `lead-bridge.gs` to match or every submission will
be skipped.

## Setup

1. Go to https://script.google.com/home → **New project**. Sign in as the account
   that should **own** the Form.
2. Delete the placeholder `Code.gs` contents and paste in all of `lead-bridge.gs`.
   Save.
3. **Project Settings** (gear icon) → **Script Properties** → add two:

   | Property | Value |
   | --- | --- |
   | `INGEST_URL` | `https://<platform-domain>/api/leads` |
   | `INGEST_KEY` | the platform's `LEADS_INGEST_KEY` |

   `INGEST_KEY` must match the platform's env var exactly. It lives only here —
   never in the script file, never in git. Rotating it means changing it in
   both places together.

   > Apps Script runs on Google's servers, so `INGEST_URL` must be a public
   > HTTPS URL. `http://localhost:3001` will not work — see Testing below.

4. Select **`createForm`** in the function dropdown and **Run**. Authorise when
   prompted (it needs to create the Form, read responses, and make external
   requests). The "Google hasn't verified this app" warning is expected for your
   own script — **Advanced → Go to project (unsafe)**.

   It creates the Form, installs the on-submit trigger, and logs both URLs. It
   refuses to run twice, so it can't leave an orphan Form collecting responses
   nobody reads.

5. Copy the **PUBLIC** URL from the log into `google-form-embed.tsx`
   (both `GOOGLE_FORM_URL` — keep its `?embedded=true` — and `GOOGLE_FORM_LINK`).
6. Run **`checkSetup`**. It fails loudly if a Script Property is missing, the
   consent question isn't there, or the trigger didn't install — and lists any
   Form question with no explicit mapping.

### The bill upload is off by default

`INCLUDE_BILL_UPLOAD = false` in `lead-bridge.gs`. A file-upload question forces
**every** respondent to sign in to a Google account before submitting — Google's
rule, not ours — which is a heavy drop-off on a lead form most people reach from
a phone. The bill helps with sizing, but it helps *after* contact; a lost lead
can't send one at all. Flip it to `true` if the team would rather have the bill
than the volume.

## Testing

Apps Script can't reach `localhost`, so test against a deployed platform:

- **Preferred:** point `INGEST_URL` at the deployed platform and submit the Form
  once. The lead should appear in `/dashboard` within seconds.
- **Against local dev:** expose your local platform with a tunnel
  (`cloudflared tunnel --url http://localhost:3001`) and use that HTTPS URL.

> **An empty Executions tab means the script has never run**, not that a run
> failed silently. The usual cause is that the authorisation prompt was dismissed
> or its popup was closed, so `createForm` never executed — no Form, no trigger,
> no error to read. Run `createForm` again and finish the consent flow.

Check **Executions** in the Apps Script editor to see each run. A skipped
submission logs a warning naming the consent question; a failed POST throws,
which Apps Script records and emails to the script owner. That email is the only
alerting this bridge has — a silent failure would mean leads quietly vanishing.

## Field mapping

`QUESTION_MAP` in `lead-bridge.gs` maps Form question titles to the lead. Titles
must match the Form **exactly** — they do by construction, because `createForm`
builds the questions from the same `Q` constants the mapping is keyed on. Edit a
question's wording in the Forms UI and you must edit `Q` to match. A question
with no mapping still comes through, keyed by its own title, so adding a question
to the Form never silently loses data.

(The original Form misspelled "electicity"; ours spells it correctly, which is
why the titles aren't byte-identical to the old one.)

| Form question | Lands as |
| --- | --- |
| Full Name | `name` |
| Primary Contact Phone Number | `phone` |
| Email Address for Correspondence | `email` |
| Installation Address | detail `Address` |
| Monthly electricity bill range | detail `Monthly bill (PHP)` |
| Daytime vs nighttime usage | detail `Daytime vs nighttime usage` |
| Primary usage of the structure | detail `Property type` |
| Battery storage interest | detail `Battery storage interest` |
| Best time range to contact | detail `Best time to contact` |
| Electricity bill upload | detail `Bill attachment` (Drive link) |
| Urgency rating | detail `Urgency` — see below |

Detail labels match the ones the native form already sends, so both forms
produce leads that read identically to the adviser working them.

The lead's **source** is `google_form`, which the inbox labels **"Google Form"**
— distinct from the native form's "Website Form". Both are forms, but this one
is also handed out as a bare link and carries no UTM attribution, so an adviser
seeing "Website Form" on a lead that never touched the website would have no way
to tell where it came from. `google_form` must exist in `LEAD_SOURCES` and
`PUBLIC_SOURCES` on the platform **before** the script starts sending it,
otherwise every submission is rejected with a 422.

### The urgency trap

This Form rates urgency **5 = ASAP**. The marketing site's native form rates it
**1 = ASAP**. Opposite polarity, same inbox. `formatUrgency` therefore never
sends the bare number — it writes `4 of 5 (5 = ASAP, 1 = in 6-12 months)`. If
you ever change the Form's scale, change `URGENCY_NOTE` with it.

## Known gaps

- **The Form's own email question.** The Form collects the respondent's Google
  account email *and* asks for a correspondence email. Only the latter is used
  as the lead's `email`; the Google account address is ignored, since it's often
  a personal account rather than the one they want to be reached on.
- **No attribution.** A Google Form submission carries no UTM parameters or
  landing page, so these leads have no marketing attribution — unlike native
  form and chatbot leads. If campaign tracking matters for this channel, the
  Form needs prefilled hidden questions per campaign link.
- **No spam protection beyond Google's.** The native form runs Cloudflare
  Turnstile; the Form relies on Google's own reCAPTCHA and the ingest key.
