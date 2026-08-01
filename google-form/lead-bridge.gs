/**
 * Solar Works — Google Form → platform lead bridge.
 *
 * ONE file, two jobs:
 *   `createForm()`   — run once; builds the inquiry Form and wires the trigger.
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

const FORM_DESCRIPTION =
  'Please provide your contact information and details regarding your property ' +
  'for a personalized solar installation quote.'

/**
 * Ask respondents to upload their electricity bill.
 *
 * OFF by default, and that is a deliberate trade. A file-upload question forces
 * EVERY respondent to sign in to a Google account before they can submit —
 * Google's requirement, not ours — which is a serious drop-off on a lead form
 * where most people arrive from a phone. The bill is useful for sizing, but it
 * is useful *after* contact; a lost lead can't send one at all.
 *
 * Flip to true if the team would rather have the bill than the volume.
 */
const INCLUDE_BILL_UPLOAD = false

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

/** Where the Form's urgency scale is explained, for the inbox. */
const URGENCY_NOTE = '5 = ASAP, 1 = in 6-12 months'

/**
 * Form question title → where the answer goes.
 *
 * `field` targets a first-class column on the lead; `detail` targets a labelled
 * extra shown in the inbox. Detail labels deliberately match the ones the
 * marketing site's native form already sends (see
 * `solarworks-landingpage/app/api/leads/route.ts`), so both forms produce leads
 * that read identically to the adviser working them.
 *
 * Titles must match the Form EXACTLY. `createForm` below builds the Form from
 * these same constants, so they agree by construction — but if you edit a
 * question's wording in the Forms UI afterwards, change it here too. An
 * unmapped question isn't lost: it falls through to a detail keyed by its own
 * title.
 */
const Q = {
  fullName: 'Full Name',
  address: 'Installation Address',
  phone: 'Primary Contact Phone Number',
  email: 'Email Address for Correspondence',
  bill: 'What is your monthly electricity bill range in the last 6 months?',
  usage: 'What is your daytime vs nighttime electricity usage?',
  urgency: 'How would you rate your urgency for installing solar panels?',
  structure: 'What is the primary usage of the structure?',
  battery: 'Are you interested in adding a solar battery storage solution?',
  contactTime: 'What is the best time range for us to contact you?',
  billUpload: 'Please upload a copy of your most recent electricity bill (for usage analysis).',
}

const QUESTION_MAP = {
  [Q.fullName]: { field: 'name' },
  [Q.phone]: { field: 'phone' },
  [Q.email]: { field: 'email' },
  [Q.address]: { detail: 'Address' },
  [Q.bill]: { detail: 'Monthly bill (PHP)' },
  [Q.usage]: { detail: 'Daytime vs nighttime usage' },
  [Q.structure]: { detail: 'Property type' },
  [Q.battery]: { detail: 'Battery storage interest' },
  [Q.contactTime]: { detail: 'Best time to contact' },
  [Q.billUpload]: { detail: 'Bill attachment' },
  [Q.urgency]: { detail: 'Urgency', transform: formatUrgency },
}

/** Answer options, kept beside the mapping so both stay in step. */
const CHOICES = {
  bill: [
    'Less than Php 7,000.00',
    'Php 7,000.00 - 10,000.00',
    'Php 10,000.00 - 12,000.00',
    'Php 12,000.00 - 15,000.00',
    'Php 15,000.00 - 20,000.00',
    'Php 20,000.00 - 25,000.00',
    'Php 25,000.00 - 30,000.00',
    'Php 30,000.00 - 36,000.00',
    'Above Php 36,000.00',
  ],
  usage: [
    '90% and up daytime heavy electricity usage',
    '65-75% daytime vs 25-35% nighttime usage',
    'Relatively balanced daytime vs nighttime usage',
    '65-75% nighttime vs 25-35% daytime usage',
    '90% and up nighttime heavy electricity usage',
  ],
  structure: [
    'Residential Single Family Home',
    'Residential Multi-Family Dwelling (Duplex, Apartment Building)',
    'Commercial Business / Office',
    'Industrial / Warehouse',
    'Agricultural (Farm, Barn, Greenhouse)',
    'Other',
  ],
  battery: ['Yes, definitely', "Maybe, I'd like more information", 'No, not at this time'],
}

// --- one-time setup ---------------------------------------------------------

/**
 * Build the Form and wire the submit trigger. Run this ONCE, by hand, from the
 * editor.
 *
 * Refuses to run twice: the created Form's id is stored in Script Properties, so
 * a second run would otherwise leave an orphan Form collecting responses nobody
 * reads. Clear the FORM_ID property if you genuinely want a fresh one.
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

  // Contact details — every one required; the platform needs name + phone, and
  // an adviser with no way to reach someone has no lead.
  form.addTextItem().setTitle(Q.fullName).setRequired(true)
  form.addTextItem().setTitle(Q.address).setRequired(true)
  form
    .addTextItem()
    .setTitle(Q.phone)
    .setHelpText('e.g. 09171234567')
    .setRequired(true)
  form.addTextItem().setTitle(Q.email).setRequired(true)

  // Qualification.
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
    .addScaleItem()
    .setTitle(Q.urgency)
    .setBounds(1, 5)
    .setLabels('in 6-12 months', 'ASAP')
    .setRequired(true)
  form.addMultipleChoiceItem().setTitle(Q.structure).setChoiceValues(CHOICES.structure)
  form.addMultipleChoiceItem().setTitle(Q.battery).setChoiceValues(CHOICES.battery)
  form
    .addTextItem()
    .setTitle(Q.contactTime)
    .setHelpText('e.g. weekday mornings, or 1-4 PM')

  if (INCLUDE_BILL_UPLOAD) {
    // Note: this forces every respondent to sign in to Google. See the comment
    // on INCLUDE_BILL_UPLOAD.
    form.addFileUploadItem().setTitle(Q.billUpload)
  }

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

// --- helpers ----------------------------------------------------------------

/**
 * Label the urgency rating with the direction of the scale.
 *
 * Load-bearing: this Form rates urgency 5 = ASAP, while the marketing site's
 * native form rates it 1 = ASAP. Two forms, opposite polarity, same inbox — so
 * the number is never sent bare. Without this an adviser reading "5" would rank
 * the most urgent lead as the least urgent one.
 */
function formatUrgency(value) {
  const rating = String(value).trim()
  if (!rating) return ''
  return rating + ' of 5 (' + URGENCY_NOTE + ')'
}

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
    const value = mapping && mapping.transform ? mapping.transform(answer) : answer
    if (!value) continue

    if (mapping && mapping.field) {
      lead[mapping.field] = value
    } else if (mapping && mapping.detail) {
      lead.details[mapping.detail] = value
    } else {
      // Unmapped question — keep it under its own title rather than drop it, so
      // adding a question to the Form doesn't silently lose data.
      lead.details[title] = value
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

  console.log('Setup looks good. ' + titles.length + ' questions, trigger installed.')
  console.log('PUBLIC (embed): ' + form.getPublishedUrl())
}
