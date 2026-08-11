# Google Form → lead bridge

Turns submissions of **"Solar Works: Customer Info and Requirements Form"** into
real leads in the platform, so a Google Form lead lands in the dashboard inbox
next to the ones from the native form, the chatbot and Messenger.

`lead-bridge.gs` runs in Google Apps Script. On submit it POSTs to the platform's
`/api/leads` with the shared ingest key — the same endpoint the marketing site
already uses, so the lead gets its `SW-YYYYMMDD-####` reference, the sales email,
the in-app notification and the n8n dispatch with no second code path to
maintain.

## What the Form asks

Four questions plus consent — deliberately the **same four the Messenger bot
asks**, with the **same answer options**, so a Form lead and a Messenger lead
read identically to the adviser working them.

| # | Question (exact title) | Type |
| --- | --- | --- |
| 1 | Full Name | short text, required |
| 2 | Mobile Number | short text, required |
| 3 | What is your monthly electricity bill range in the last 6 months? | multiple choice, required |
| 4 | What is your daytime vs nighttime electricity usage? | multiple choice, required |
| 5 | What do you want solar to do for your electricity bill? | multiple choice, required |
| 6 | *the consent question* | multiple choice Yes/No, required, always last |

The options for 3, 4 and 5 are copied **verbatim** from
`solarworks-platform/lib/chat/vocab.ts` — `MONTHLY_BILL_RANGES`,
`USAGE_PATTERNS` and `PRIMARY_GOALS` respectively:

| Question | Options |
| --- | --- |
| Bill range | `Below ₱3,000` · `₱3,000 – ₱5,000` · `₱5,000 – ₱10,000` · `₱10,000 – ₱20,000` · `Above ₱20,000` · `Not sure` |
| Usage | `Mostly daytime` · `Mostly night` · `About even` · `Not sure` |
| Goal | `Cut bill by ~50%` · `Near-zero bill` · `Fix brownout issues` · `All of these` |

These strings are **data, not copy**. They are stored on the lead and read in the
dashboard, so a Form option that differs from the vocabulary by so much as a peso
sign or a dash puts two spellings of the same answer in the inbox. The separator
is an **en dash** (`–`, U+2013) with a space either side, not a hyphen. Copy,
don't retype. If the vocabulary changes in the platform, change `CHOICES` in
`lead-bridge.gs` and run `updateForm`.

The Form used to also ask for a correspondence email, the installation address,
the property type, battery interest, best contact time and an urgency rating.
All of them are gone: an adviser asks those on the call they are about to make,
and every extra question on a form most people reach from a phone costs
submissions.

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

`updateForm` never touches this question — not to delete it, not to rename it,
not to move it. It refuses to start if the question is missing, skips it
explicitly in both the delete and the rename passes, and re-checks that it is
still there before reporting success.

## Migrating the live Form

**The Form already exists.** `createForm()` refuses to run a second time — it
stores the Form's id in the `FORM_ID` script property and throws if it finds one,
so it can never orphan a Form that is already collecting responses. It is for a
fresh setup only, and it is **not** the way to change the Form.

`updateForm()` is. It opens the live Form through the same `targetForm()` the
bridge uses and migrates it in place:

1. Refuses to start if the consent question is missing — nothing is changed.
2. Renames `Primary Contact Phone Number` → `Mobile Number`. A rename, not a
   delete-and-add, so the question keeps its answers and its column.
3. Rewrites the bill and usage options to match `vocab.ts` if they have drifted,
   and makes both required.
4. Adds the goal question if it isn't there, positioned above consent.
5. Deletes the retired questions, in descending index order.
6. Reports the resulting question order (it reports rather than fixes — fixing
   would mean moving items, and consent is the one item it will not move).
7. Verifies consent is still present, and throws loudly if it somehow isn't.

It is **safe to re-run**: every step checks the current state first, so a second
run logs "already correct" instead of adding a second copy of every question.

> ### ⚠ Export the responses before you run it
>
> Deleting a question from a live Google Form does **not** delete the answers
> already collected — they stay in the linked response sheet. But the column
> **stops being written**, and the Forms summary view drops the question
> entirely, so from the Forms UI the history looks gone even though it isn't.
> Before running `updateForm`, open the Form → **Responses** → the green Sheets
> icon, or **⋮ → Download responses (.csv)**, and keep a copy. There is no undo.

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

   > **The Form already exists**, so on the live project this step is
   > **`updateForm`**, not `createForm` — after exporting the responses. See
   > *Migrating the live Form* above.

5. Copy the **PUBLIC** URL from the log into `google-form-embed.tsx`
   (both `GOOGLE_FORM_URL` — keep its `?embedded=true` — and `GOOGLE_FORM_LINK`).
   Only needed for a fresh Form; `updateForm` keeps the existing URL.
6. Run **`checkSetup`**. It fails loudly if a Script Property is missing, the
   consent question isn't there, or the trigger didn't install. It also warns
   about any Form question with no explicit mapping, any mapped question that is
   **missing** from the Form (what a half-finished migration looks like), and any
   choice question whose options have drifted from `vocab.ts`.

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
and `updateForm` build the questions from the same `Q` constants the mapping is
keyed on. Edit a question's wording in the Forms UI and you must edit `Q` to
match. A question with no mapping still comes through, keyed by its own title, so
adding a question to the Form never silently loses data.

(The original Form misspelled "electicity"; ours spells it correctly, which is
why the titles aren't byte-identical to the old one.)

| Form question | Lands as |
| --- | --- |
| Full Name | `name` |
| Mobile Number | `phone` |
| Monthly electricity bill range | detail `Monthly bill (PHP)` |
| Daytime vs nighttime electricity usage | detail `Daytime vs nighttime usage` |
| What do you want solar to do for your electricity bill? | detail `Primary goal` |

Detail labels match the ones the other channels already send, so all three
produce leads that read identically to the adviser working them:

- **`Monthly bill (PHP)`** is what the native site form
  (`solarworks-landingpage/app/api/leads/route.ts`) and the chat brain's
  `handleSaveLead` (`solarworks-platform/lib/chat/brain.ts`) both write.
- **`Primary goal`** is the chat channel's label — see `CHOICE_FIELDS.primaryGoal`
  in `vocab.ts`, which is deliberately *not* renamed to "Electricity goal"
  because it is the key every existing lead already carries.
- **`Daytime vs nighttime usage`** is now unanimous across all three channels.
  The chat brain used to write `Daytime vs night use`; it was moved to this
  spelling on 2026-08-11 rather than the other way round, because the native
  site form and this Form's existing responses already carried it. Changing it
  here means changing `CHOICE_FIELDS.usagePattern` in the platform's `vocab.ts`
  in the same commit.

The lead's **source** is `google_form`, which the inbox labels **"Google Form"**
— distinct from the native form's "Website Form". Both are forms, but this one
is also handed out as a bare link and carries no UTM attribution, so an adviser
seeing "Website Form" on a lead that never touched the website would have no way
to tell where it came from. `google_form` must exist in `LEAD_SOURCES` and
`PUBLIC_SOURCES` on the platform **before** the script starts sending it,
otherwise every submission is rejected with a 422.

## Known gaps

- **No email on the lead.** The Form no longer asks for a correspondence email,
  so these leads arrive with a phone number and nothing else to reach them on.
  That is the trade the four-question set makes; the adviser gets an email
  address on the call. (The Google account address the Form may collect is still
  ignored — it's often a personal account rather than the one they want to be
  reached on.)
- **No address on the lead.** Same trade. Nothing downstream hard-fails without
  it: `createLead` takes no address, and `lead-intel` never scores location.
- **No attribution.** A Google Form submission carries no UTM parameters or
  landing page, so these leads have no marketing attribution — unlike native
  form and chatbot leads. If campaign tracking matters for this channel, the
  Form needs prefilled hidden questions per campaign link.
- **No spam protection beyond Google's.** The native form runs Cloudflare
  Turnstile; the Form relies on Google's own reCAPTCHA and the ingest key.
