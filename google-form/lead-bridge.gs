/**
 * Solar Works — Google Form → platform lead bridge.
 *
 * ONE file, three jobs:
 *   `createForm()`   — run once on a FRESH setup; builds the inquiry Form and
 *                      wires the trigger. Refuses to run twice.
 *   `updateForm()`   — the migration for the Form that ALREADY EXISTS; brings a
 *                      live Form onto the current question set in place.
 *   `onFormSubmit()` — the bridge; runs on every submission from then on.
 *
 * Each submission is mapped onto the platform's canonical lead shape and POSTed
 * to `/api/leads` with the shared ingest key — the same endpoint the marketing
 * site's native form uses, so a Form lead is indistinguishable downstream: it
 * gets its `SW-YYYYMMDD-####` reference, the sales email, the dashboard
 * notification and the n8n dispatch, with no separate code path to keep in sync.
 *
 * SETUP — see README.md in this folder. In short:
 *   1. script.google.com → New project → paste this file in.
 *   2. Project Settings → Script Properties: add INGEST_URL and INGEST_KEY.
 *   3. Run `createForm` once. It logs the Form's edit + public URLs.
 *      (If the Form already exists — it does — run `updateForm` instead. Export
 *      the existing responses FIRST; see the warning on that function.)
 *   4. Put the public URL into `components/google-form-embed.tsx`.
 *
 * Works as a STANDALONE script (it creates and owns the Form) or bound to an
 * existing Form — see `targetForm()`.
 *
 * SECURITY: INGEST_KEY is a shared secret and lives ONLY in Script Properties,
 * never in this file. Anyone with the key can create leads, so treat a leak the
 * way you would a password — rotate it in Vercel and here together.
 */

// --- configuration ----------------------------------------------------------

const FORM_TITLE = 'Solar Works: Customer Info and Requirements Form'

/**
 * Only used by `createForm`. `updateForm` deliberately leaves the live Form's
 * own description alone — it is visitor-facing copy the team may have edited.
 */
const FORM_DESCRIPTION =
  'Four quick questions and we will come back to you with a personalized solar ' +
  'assessment. It takes about a minute.'

/**
 * The consent question. REQUIRED on the Form, and the answer must start with
 * "Yes" for the lead to be forwarded.
 *
 * Not optional politeness: the platform rejects any lead without recorded
 * consent (`consent: z.literal(true)` in its ingest schema), and the spec gates
 * storage and sales notification on consent being recorded rather than assumed.
 * A Form with no consent question means every submission is skipped — by
 * design, so the failure is visible instead of silent.
 */
const CONSENT_QUESTION =
  'I agree to let Solar Works contact me and store my information for assessment purposes.'

const PRIVACY_NOTICE_URL = 'https://solar-works-website.vercel.app/privacy'

/**
 * Form question title → where the answer goes.
 *
 * `field` targets a first-class column on the lead; `detail` targets a labelled
 * extra shown in the inbox. Detail labels deliberately match the ones the other
 * channels already send — the marketing site's native form
 * (`solarworks-landingpage/app/api/leads/route.ts`) and the Messenger bot
 * (`solarworks-platform/lib/chat/brain.ts`, `handleSaveLead`) — so a Form lead
 * and a Messenger lead read identically to the adviser working them.
 *
 * Titles must match the Form EXACTLY. `createForm` and `updateForm` below build
 * the Form from these same constants, so they agree by construction — but if you
 * edit a question's wording in the Forms UI afterwards, change it here too. An
 * unmapped question isn't lost: it falls through to a detail keyed by its own
 * title.
 *
 * FOUR questions plus consent, matching the Messenger bot's qualification
 * exactly. Everything else the Form used to ask (correspondence email, address,
 * property type, battery interest, contact time, urgency, bill upload) is gone —
 * an adviser asks those on the call they are about to make, and every extra
 * question on a phone-first lead form costs submissions.
 */
const Q = {
  fullName: 'Full Name',
  phone: 'Mobile Number',
  bill: 'What is your monthly electricity bill range in the last 6 months?',
  usage: 'What is your daytime vs nighttime electricity usage?',
  goal: 'What do you want solar to do for your electricity bill?',
}

const QUESTION_MAP = {
  [Q.fullName]: { field: 'name' },
  [Q.phone]: { field: 'phone' },
  // "Monthly bill (PHP)" is the label BOTH the native form and `handleSaveLead`
  // write, so all three channels land in the same row of the inbox.
  [Q.bill]: { detail: 'Monthly bill (PHP)' },
  // Unanimous across all three channels as of 2026-08-11. The chat brain used
  // to write "Daytime vs night use"; it was moved to this spelling rather than
  // the other way round, because the native site form and this Form's existing
  // responses already carried it. Change it here and you must change
  // `CHOICE_FIELDS.usagePattern` in the platform's vocab.ts to match.
  [Q.usage]: { detail: 'Daytime vs nighttime usage' },
  // "Primary goal" is the chat channel's label for this question — see
  // `CHOICE_FIELDS.primaryGoal` in `solarworks-platform/lib/chat/vocab.ts`,
  // where the comment explains it stays "Primary goal" even though the options
  // changed wholesale, because it is the key every existing lead already carries.
  [Q.goal]: { detail: 'Primary goal' },
}

/**
 * Answer options, kept beside the mapping so both stay in step.
 *
 * These are copied VERBATIM from the canonical vocabulary the Messenger bot
 * uses — `MONTHLY_BILL_RANGES`, `USAGE_PATTERNS` and `PRIMARY_GOALS` in
 * `solarworks-platform/lib/chat/vocab.ts`. They are matched as data downstream,
 * so a Form option that differs by even a peso sign or a dash produces a second
 * spelling of the same answer in the inbox. If the vocabulary changes there,
 * change it here and run `updateForm`.
 *
 * Note the characters: "₱" is U+20B1 and the range separator is an EN DASH
 * (U+2013) with a space either side, not a hyphen. Copy, don't retype.
 */
const CHOICES = {
  bill: [
    'Below ₱3,000',
    '₱3,000 – ₱5,000',
    '₱5,000 – ₱10,000',
    '₱10,000 – ₱20,000',
    'Above ₱20,000',
    'Not sure',
  ],
  usage: ['Mostly daytime', 'Mostly night', 'About even', 'Not sure'],
  goal: ['Cut bill by ~50%', 'Near-zero bill', 'Fix brownout issues', 'All of these'],
}

/**
 * The order the Form asks its questions in, consent excluded (consent is always
 * last and `updateForm` never moves it). Used by `updateForm` to put a
 * newly-added question in the right place and to check the order afterwards.
 */
const QUESTION_ORDER = [Q.fullName, Q.phone, Q.bill, Q.usage, Q.goal]

/**
 * Questions the Form used to ask and no longer should. `updateForm` deletes any
 * of these it finds. Kept as literal strings rather than references into `Q`
 * because `Q` no longer has entries for them — these titles exist only on the
 * live Form.
 */
const RETIRED_QUESTIONS = [
  'Email Address for Correspondence',
  'Installation Address',
  'What is the primary usage of the structure?',
  'Are you interested in adding a solar battery storage solution?',
  'What is the best time range for us to contact you?',
  'How would you rate your urgency for installing solar panels?',
  'Please upload a copy of your most recent electricity bill (for usage analysis).',
]

/**
 * Questions that were REWORDED rather than removed: old title → new title.
 *
 * These are renamed in place by `updateForm`, never deleted and re-added. A
 * rename keeps the question's existing responses and its column in the response
 * sheet; a delete-and-add starts a new column and orphans the old answers.
 */
const RENAMED_QUESTIONS = {
  'Primary Contact Phone Number': Q.phone,
}

// --- one-time setup ---------------------------------------------------------

/**
 * Build the Form and wire the submit trigger. Run this ONCE, by hand, from the
 * editor, on a FRESH setup only.
 *
 * Refuses to run twice: the created Form's id is stored in Script Properties, so
 * a second run would otherwise leave an orphan Form collecting responses nobody
 * reads. Clear the FORM_ID property if you genuinely want a fresh one.
 *
 * The Form already exists and is collecting responses, so this is NOT the way to
 * change it — use `updateForm`, which migrates the live Form in place.
 */
function createForm() {
  const props = PropertiesService.getScriptProperties()
  const existing = props.getProperty('FORM_ID')
  if (existing) {
    throw new Error(
      'A Form was already created by this script (id ' +
        existing +
        '). Delete the FORM_ID script property first if you really want another.',
    )
  }

  const form = FormApp.create(FORM_TITLE)
    .setDescription(FORM_DESCRIPTION)
    .setProgressBar(false)
    .setAllowResponseEdits(false)

  // Contact details — both required; the platform needs name + phone, and an
  // adviser with no way to reach someone has no lead.
  form.addTextItem().setTitle(Q.fullName).setRequired(true)
  form
    .addTextItem()
    .setTitle(Q.phone)
    .setHelpText('e.g. 09171234567')
    .setRequired(true)

  // Qualification — the same three questions the Messenger bot asks, with the
  // same options, so both channels produce leads that read identically.
  form
    .addMultipleChoiceItem()
    .setTitle(Q.bill)
    .setChoiceValues(CHOICES.bill)
    .setRequired(true)
  form
    .addMultipleChoiceItem()
    .setTitle(Q.usage)
    .setChoiceValues(CHOICES.usage)
    .setRequired(true)
  form
    .addMultipleChoiceItem()
    .setTitle(Q.goal)
    .setChoiceValues(CHOICES.goal)
    .setRequired(true)

  // Consent last, immediately above Submit — the natural place to agree to
  // something is right before you commit to it.
  form
    .addMultipleChoiceItem()
    .setTitle(CONSENT_QUESTION)
    .setHelpText('Read our Privacy Notice: ' + PRIVACY_NOTICE_URL)
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true)

  props.setProperty('FORM_ID', form.getId())

  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create()

  // Newer Forms keeps drafts unpublished; older ones have no such concept.
  try {
    form.setPublished(true)
  } catch (err) {
    console.log('setPublished not available on this runtime — publish from the UI if needed.')
  }

  console.log('Form created. Trigger installed.')
  console.log('EDIT (you):        ' + form.getEditUrl())
  console.log('PUBLIC (embed):    ' + form.getPublishedUrl())
  console.log('')
  console.log('Next: put the PUBLIC url into components/google-form-embed.tsx,')
  console.log('then run checkSetup to confirm the properties are in place.')
}

/**
 * The Form this script drives — the one it created, or the one it's bound to.
 * Lets the same file work standalone or bound without a second variant.
 */
function targetForm() {
  const id = PropertiesService.getScriptProperties().getProperty('FORM_ID')
  if (id) return FormApp.openById(id)

  const bound = FormApp.getActiveForm()
  if (bound) return bound

  throw new Error('No Form found. Run createForm first, or bind this script to a Form.')
}

// --- migrating the live Form -------------------------------------------------

/**
 * Bring the LIVE Form onto the question set above, in place.
 *
 * `createForm` cannot do this — it refuses to run once FORM_ID is set, precisely
 * so it can never orphan a Form that is already collecting responses. This is
 * the migration path for the Form that exists.
 *
 * ⚠ READ BEFORE RUNNING — EXPORT THE RESPONSES FIRST.
 * Deleting a question from a live Google Form does NOT delete the answers people
 * have already given it. The answers stay in the linked response sheet, but the
 * column STOPS BEING WRITTEN and Forms' own summary view drops the question, so
 * from the Forms UI the history looks gone even though it isn't. Before running
 * this, open the Form → Responses → the green Sheets icon (or ⋮ → Download
 * responses as .csv) and keep a copy. There is no undo.
 *
 * Safe to run more than once. Every step checks the current state first, so a
 * second run reports "already correct" rather than adding a second copy of every
 * question.
 *
 * What it will NEVER do: delete, rename, reorder or otherwise touch the consent
 * question. That question is what makes a submission forwardable at all — lose
 * it and every future lead is silently skipped — so it is excluded from the
 * delete and rename passes explicitly, and its presence is re-verified at the
 * end before this function reports success.
 */
function updateForm() {
  const form = targetForm()

  console.log('=== updateForm — migrating "' + form.getTitle() + '" ===')
  console.log(
    'WARNING: deleting a question does NOT delete the answers already collected, ' +
      'but its column stops being written and the Forms summary drops it. ' +
      'If you have not exported the existing responses yet, stop and do that first.',
  )

  // Consent must be found BEFORE anything is changed. If it is missing, the Form
  // is already broken and the safe move is to change nothing.
  if (!findItemByTitle(form, CONSENT_QUESTION)) {
    throw new Error(
      'The Form has no question titled "' +
        CONSENT_QUESTION +
        '". Nothing was changed. Add that question back (required, Yes/No) before ' +
        'running updateForm — without it every submission is skipped.',
    )
  }

  // 1. Renames, before anything looks a question up by its new title.
  const oldTitles = Object.keys(RENAMED_QUESTIONS)
  for (let r = 0; r < oldTitles.length; r++) {
    const from = oldTitles[r]
    const to = RENAMED_QUESTIONS[from]
    if (from === CONSENT_QUESTION || to === CONSENT_QUESTION) continue
    const stale = findItemByTitle(form, from)
    if (!stale) {
      console.log('RENAME  skipped — no question titled "' + from + '" (already renamed?)')
      continue
    }
    if (findItemByTitle(form, to)) {
      console.warn(
        'RENAME  skipped — both "' +
          from +
          '" and "' +
          to +
          '" exist. Sort this out by hand; renaming would give the Form two ' +
          'questions with the same title.',
      )
      continue
    }
    stale.setTitle(to)
    console.log('RENAMED "' + from + '" → "' + to + '" (responses and column preserved)')
  }

  // 2. Name and phone must be required — the platform rejects a lead without
  //    both, and `onFormSubmit` throws rather than send one.
  requireQuestion(form, Q.fullName)
  requireQuestion(form, Q.phone)

  // 3. Sync the choice questions' options with the canonical vocabulary, and
  //    make sure they are required too.
  syncChoices(form, Q.bill, CHOICES.bill)
  syncChoices(form, Q.usage, CHOICES.usage)

  // 4. Add the goal question if it isn't there, positioned just above consent.
  if (findItemByTitle(form, Q.goal)) {
    console.log('ADD     skipped — "' + Q.goal + '" is already on the Form')
    syncChoices(form, Q.goal, CHOICES.goal)
  } else {
    const goal = form.addMultipleChoiceItem()
    goal.setTitle(Q.goal).setChoiceValues(CHOICES.goal).setRequired(true)
    // addMultipleChoiceItem appends, which puts it AFTER consent. Move it to the
    // consent question's index, which pushes consent down one — consent stays
    // last, which is the only thing that matters about its position.
    const consentIndex = findItemByTitle(form, CONSENT_QUESTION).getIndex()
    form.moveItem(goal.getIndex(), consentIndex)
    console.log('ADDED   "' + Q.goal + '" with ' + CHOICES.goal.length + ' options, above consent')
  }

  // 5. Delete the retired questions. Descending index order: an Item's cached
  //    index goes stale the moment an earlier item is removed.
  const doomed = []
  for (let d = 0; d < RETIRED_QUESTIONS.length; d++) {
    const title = RETIRED_QUESTIONS[d]
    // Belt and braces. RETIRED_QUESTIONS is a literal list that does not contain
    // the consent question, and this makes sure it never can.
    if (title === CONSENT_QUESTION) {
      console.warn('DELETE  REFUSED — "' + title + '" is the consent question. Left alone.')
      continue
    }
    const item = findItemByTitle(form, title)
    if (!item) {
      console.log('DELETE  skipped — no question titled "' + title + '" (already removed?)')
      continue
    }
    doomed.push(item)
  }
  doomed.sort(function (a, b) {
    return b.getIndex() - a.getIndex()
  })
  for (let x = 0; x < doomed.length; x++) {
    const title = doomed[x].getTitle()
    form.deleteItem(doomed[x])
    console.log('DELETED "' + title + '" — its existing answers remain in the response sheet')
  }

  // 6. Report the resulting order. Deliberately a report, not a fix: reordering
  //    means moving items, and the one item we will not move is consent.
  const finalTitles = form.getItems().map(function (item) {
    return item.getTitle().trim()
  })
  const expected = QUESTION_ORDER.concat([CONSENT_QUESTION])
  if (finalTitles.join(' | ') === expected.join(' | ')) {
    console.log('ORDER   correct: ' + finalTitles.join(' | '))
  } else {
    console.warn(
      'ORDER   differs from the intended one — reorder by hand in the Forms UI ' +
        '(drag; do not delete and re-add).\n  now:      ' +
        finalTitles.join(' | ') +
        '\n  intended: ' +
        expected.join(' | '),
    )
  }

  // 7. Consent survived. Checked last, on purpose — if this ever throws, the
  //    Form needs fixing by hand before it can take another submission.
  if (!findItemByTitle(form, CONSENT_QUESTION)) {
    throw new Error(
      'The consent question "' +
        CONSENT_QUESTION +
        '" is gone after updateForm. Every submission will now be skipped. Add it ' +
        'back immediately as a REQUIRED Yes/No question with exactly this title.',
    )
  }
  console.log('CONSENT untouched and still present — leads will keep flowing.')

  console.log('Done. Run checkSetup to confirm the mapping and the trigger.')
  console.log('EDIT (you):     ' + form.getEditUrl())
  console.log('PUBLIC (embed): ' + form.getPublishedUrl())
}

/**
 * Make sure a question is marked required. Never applied to consent — it is
 * already required and this function does not touch it on principle.
 */
function requireQuestion(form, title) {
  if (title === CONSENT_QUESTION) return

  const item = findItemByTitle(form, title)
  if (!item) {
    console.warn('REQUIRE skipped — no question titled "' + title + '" on the Form')
    return
  }
  if (item.getType() !== FormApp.ItemType.TEXT) {
    console.warn(
      'REQUIRE skipped — "' + title + '" is a ' + item.getType() + ' question, not short text.',
    )
    return
  }

  const text = item.asTextItem()
  if (text.isRequired()) {
    console.log('REQUIRE already set on "' + title + '"')
    return
  }
  text.setRequired(true)
  console.log('REQUIRE turned on for "' + title + '"')
}

/**
 * Point the given question's options at `wanted`, and make it required.
 *
 * A no-op when they already agree, so `updateForm` stays re-runnable. Changing
 * the options does not touch answers already recorded — an old answer simply is
 * no longer one of the offered choices.
 */
function syncChoices(form, title, wanted) {
  if (title === CONSENT_QUESTION) return

  const item = findItemByTitle(form, title)
  if (!item) {
    console.warn('OPTIONS skipped — no question titled "' + title + '" on the Form')
    return
  }
  if (item.getType() !== FormApp.ItemType.MULTIPLE_CHOICE) {
    console.warn(
      'OPTIONS skipped — "' +
        title +
        '" is a ' +
        item.getType() +
        ' question, not multiple choice. Convert it by hand.',
    )
    return
  }

  const choice = item.asMultipleChoiceItem()
  const current = choice.getChoices().map(function (c) {
    return c.getValue()
  })

  if (current.join('\n') === wanted.join('\n') && choice.isRequired()) {
    console.log('OPTIONS already correct for "' + title + '"')
    return
  }

  choice.setChoiceValues(wanted).setRequired(true)
  console.log(
    'OPTIONS updated for "' +
      title +
      '"\n  was:  ' +
      current.join(' | ') +
      '\n  now:  ' +
      wanted.join(' | '),
  )
}

/** First item with this exact (trimmed) title, or null. */
function findItemByTitle(form, title) {
  const items = form.getItems()
  for (let i = 0; i < items.length; i++) {
    if (items[i].getTitle().trim() === title) return items[i]
  }
  return null
}

// --- helpers ----------------------------------------------------------------

/** Answers can be arrays (checkboxes) or grids; flatten to one trimmed string. */
function answerToString(answer) {
  if (answer === null || answer === undefined) return ''
  if (Array.isArray(answer)) {
    return answer
      .map(function (part) {
        return answerToString(part)
      })
      .filter(String)
      .join(', ')
  }
  return String(answer).trim()
}

/** Read a required Script Property, or throw with a message that names it. */
function requiredProperty(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key)
  if (!value) {
    throw new Error(
      'Script Property "' + key + '" is not set. Add it under Project Settings → Script Properties.',
    )
  }
  return value
}

// --- the trigger ------------------------------------------------------------

/**
 * On-form-submit trigger.
 *
 * Deliberately allowed to throw: Apps Script records a failed execution and
 * emails the script owner, which is the only alerting this bridge has. Swallowing
 * errors here would mean leads vanishing with nobody the wiser — the opposite of
 * the platform's own fire-and-forget rule, where the lead is already safely
 * stored before anything downstream runs.
 */
function onFormSubmit(e) {
  const ingestUrl = requiredProperty('INGEST_URL')
  const ingestKey = requiredProperty('INGEST_KEY')

  // `google_form`, not `website_form` — the inbox labels these "Google Form" so
  // an adviser can tell a Form lead from one typed into the site's own form.
  // The two are genuinely different channels: this one is also handed out as a
  // bare link and carries no UTM attribution.
  const lead = { source: 'google_form', details: {} }
  let consented = false

  const responses = e.response.getItemResponses()
  for (let i = 0; i < responses.length; i++) {
    const title = responses[i].getItem().getTitle().trim()
    const answer = answerToString(responses[i].getResponse())
    if (!answer) continue

    if (title === CONSENT_QUESTION) {
      // Affirmative only. An unticked box, a "No", or a blank all leave this
      // false and the submission is dropped below.
      consented = /^yes/i.test(answer)
      lead.details['Consent'] = consented
        ? 'Yes — consent question answered on the Google Form'
        : answer
      continue
    }

    const mapping = QUESTION_MAP[title]
    if (mapping && mapping.field) {
      lead[mapping.field] = answer
    } else if (mapping && mapping.detail) {
      lead.details[mapping.detail] = answer
    } else {
      // Unmapped question — keep it under its own title rather than drop it, so
      // adding a question to the Form doesn't silently lose data.
      lead.details[title] = answer
    }
  }

  if (!consented) {
    // Not an error: a visitor may legitimately decline. Logged so a MISSING
    // consent question (which would skip every single submission) is easy to
    // spot in the execution log.
    console.warn(
      'Submission skipped — no affirmative answer to the consent question "' +
        CONSENT_QUESTION +
        '". If every submission is skipped, that question is missing from the Form.',
    )
    return
  }

  if (!lead.name || !lead.phone) {
    throw new Error(
      'Submission is missing a name or phone number; the platform requires both. ' +
        'Check that "' +
        Q.fullName +
        '" and "' +
        Q.phone +
        '" are required questions and that QUESTION_MAP still matches their titles.',
    )
  }

  // Consent is verified above, never assumed — the platform re-checks it.
  lead.consent = true

  postLead(ingestUrl, ingestKey, lead)
}

/**
 * POST the lead, retrying once on a server-side failure.
 *
 * Mirrors `forwardLead` in the marketing site: a 5xx means the write almost
 * certainly didn't happen, so a second attempt won't duplicate it, whereas
 * giving up loses a lead the visitor already consented to and typed out. A 4xx
 * is never retried — the same bytes would be rejected the same way.
 */
function postLead(url, key, lead) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-ingest-key': key },
      payload: JSON.stringify(lead),
      muteHttpExceptions: true,
    })

    const status = res.getResponseCode()
    if (status >= 200 && status < 300) {
      console.log('Lead forwarded for ' + lead.name + ' (HTTP ' + status + ')')
      return
    }

    const body = res.getContentText()
    if (status < 500 || attempt === 2) {
      throw new Error('Lead forward failed (HTTP ' + status + '): ' + body)
    }
    console.warn('Lead forward attempt ' + attempt + ' failed (HTTP ' + status + '), retrying')
    Utilities.sleep(600)
  }
}

// --- setup check ------------------------------------------------------------

/**
 * Run this manually after setup. Verifies the properties are set and that the
 * Form actually carries the consent question, so a misconfiguration surfaces now
 * rather than as silently-skipped leads later.
 */
function checkSetup() {
  requiredProperty('INGEST_URL')
  requiredProperty('INGEST_KEY')

  const form = targetForm()
  const titles = form.getItems().map(function (item) {
    return item.getTitle().trim()
  })

  if (titles.indexOf(CONSENT_QUESTION) === -1) {
    throw new Error(
      'The Form has no question titled "' +
        CONSENT_QUESTION +
        '". Every submission would be skipped. Add it as a REQUIRED question.',
    )
  }

  const triggers = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'onFormSubmit'
  })
  if (!triggers.length) {
    throw new Error('No onFormSubmit trigger installed. Add one under Triggers.')
  }

  // On the Form but not in QUESTION_MAP — not lost, but not labelled either.
  // Usually the sign of a question added in the Forms UI, or of a title edited
  // there without the matching edit to `Q`.
  const unmapped = titles.filter(function (title) {
    return title && title !== CONSENT_QUESTION && !QUESTION_MAP[title]
  })
  if (unmapped.length) {
    console.warn(
      'These questions have no explicit mapping and will land in the lead as ' +
        'details keyed by their own title: ' +
        unmapped.join(' | '),
    )
  }

  // The other direction: in QUESTION_MAP but not on the Form. This is what a
  // half-finished migration looks like — run `updateForm`.
  const missing = QUESTION_ORDER.filter(function (title) {
    return titles.indexOf(title) === -1
  })
  if (missing.length) {
    console.warn(
      'These questions are mapped but are NOT on the Form, so the lead will ' +
        'never carry them: ' +
        missing.join(' | ') +
        '. Run updateForm to bring the Form onto the current question set.',
    )
  }

  // Options drift silently: the Form keeps working, but its answers stop
  // matching the vocabulary the Messenger bot writes, and the inbox ends up with
  // two spellings of the same answer.
  reportChoiceDrift(form, Q.bill, CHOICES.bill)
  reportChoiceDrift(form, Q.usage, CHOICES.usage)
  reportChoiceDrift(form, Q.goal, CHOICES.goal)

  console.log('Setup looks good. ' + titles.length + ' questions, trigger installed.')
  console.log('PUBLIC (embed): ' + form.getPublishedUrl())
}

/** Warn (never change anything) when a question's options have drifted. */
function reportChoiceDrift(form, title, wanted) {
  const item = findItemByTitle(form, title)
  if (!item || item.getType() !== FormApp.ItemType.MULTIPLE_CHOICE) return

  const current = item
    .asMultipleChoiceItem()
    .getChoices()
    .map(function (c) {
      return c.getValue()
    })
  if (current.join('\n') === wanted.join('\n')) return

  console.warn(
    'Options for "' +
      title +
      '" have drifted from the canonical list. Run updateForm.\n  on the Form: ' +
      current.join(' | ') +
      '\n  expected:    ' +
      wanted.join(' | '),
  )
}
