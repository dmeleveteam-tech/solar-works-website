import { test } from "node:test"
import assert from "node:assert/strict"

import {
  CHOICE_FIELDS,
  CHOICE_FIELD_KEYS,
  CONSENT_ACCEPT_TEXT,
  DETAIL_FIELDS,
  FORMAT_EXAMPLES,
  MONTHLY_BILL_RANGES,
} from "../chat/vocab"
import {
  ALREADY_A_LEAD_TEXT,
  ASSESSMENT_QUESTIONS_TEXT,
  ASSESSMENT_UPDATE_PREFACE,
  FAQ_STARTERS,
  FORM_HANDOFF_TEXT,
  GOOGLE_FORM_URL,
  GREETING_TEXT,
  HUMAN_HANDOFF_TEXT,
  MENU_FORM,
  MENU_PAYLOADS,
  MENU_PROMPT,
  MENU_RESET,
  MENU_RESET_CONFIRM,
  MENU_TITLES,
  PERSISTENT_MENU_MAX,
  RESET_CONFIRM_TEXT,
  RESET_DONE_TEXT,
  RESET_NOTHING_TEXT,
  assessmentQuickReplies,
  faqQuickReplies,
  isMenuPayload,
  menuQuickReplies,
  messengerProfilePayload,
  repeatLeadQuickReplies,
  resetConfirmQuickReplies,
  workAndPricingText,
} from "./menu"
import { PAYLOAD_MAX, QUICK_REPLY_MAX, TITLE_MAX, renderChoice } from "./render"

const SITE = "https://example.test"

/**
 * These guard the two ways the menu can fail silently in production: a title
 * that overflows Meta's cap (which rejects the entire send, not just the item),
 * and a menu payload that collides with something the brain expects to parse as
 * a real answer.
 */

test("every menu quick reply fits Meta's title and payload caps", () => {
  const sets = [
    menuQuickReplies(),
    assessmentQuickReplies(),
    faqQuickReplies(),
    repeatLeadQuickReplies(),
    resetConfirmQuickReplies(),
  ]

  for (const replies of sets) {
    assert.ok(
      replies.length <= QUICK_REPLY_MAX,
      `${replies.length} quick replies exceeds Meta's cap of ${QUICK_REPLY_MAX}`,
    )
    for (const reply of replies) {
      assert.ok(
        reply.title.length <= TITLE_MAX,
        `title "${reply.title}" is ${reply.title.length} chars, over ${TITLE_MAX}`,
      )
      assert.ok(reply.title.length > 0, "a quick reply title must not be empty")
      assert.ok(
        reply.payload.length <= PAYLOAD_MAX,
        `payload for "${reply.title}" exceeds ${PAYLOAD_MAX}`,
      )
      assert.equal(reply.content_type, "text")
    }
  }
})

test("persistent menu stays inside Meta's item cap and title cap", () => {
  const actions = messengerProfilePayload().persistent_menu[0].call_to_actions

  assert.ok(
    actions.length <= PERSISTENT_MENU_MAX,
    `${actions.length} menu items exceeds ${PERSISTENT_MENU_MAX}`,
  )
  for (const action of actions) {
    assert.ok(
      action.title.length <= TITLE_MAX,
      `menu title "${action.title}" is ${action.title.length} chars, over ${TITLE_MAX}`,
    )
  }
})

/**
 * The namespace is what keeps navigation separable from conversation. If a menu
 * payload ever equalled a canonical option or the consent string, `route.ts`
 * would intercept a real answer and the field would look unanswered forever —
 * the exact failure `render.ts` was designed to avoid.
 */
test("menu payloads never collide with canonical brain vocabulary", () => {
  const canonical = new Set<string>([CONSENT_ACCEPT_TEXT])
  for (const field of CHOICE_FIELD_KEYS) {
    for (const option of CHOICE_FIELDS[field].options) canonical.add(option)
  }

  for (const payload of MENU_PAYLOADS) {
    assert.ok(payload.startsWith("SW_"), `menu payload "${payload}" must use the SW_ namespace`)
    assert.ok(!canonical.has(payload), `menu payload "${payload}" collides with brain vocabulary`)
  }
})

test("FAQ starters are real questions, not menu payloads", () => {
  for (const reply of faqQuickReplies().slice(0, FAQ_STARTERS.length)) {
    assert.ok(
      !isMenuPayload(reply.payload),
      `FAQ starter "${reply.title}" must reach the model as text, not be intercepted`,
    )
    assert.ok(reply.payload.length > reply.title.length, "the payload should carry the full question")
  }
})

test("isMenuPayload accepts only the reserved namespace", () => {
  for (const payload of MENU_PAYLOADS) assert.ok(isMenuPayload(payload))
  assert.ok(!isMenuPayload(undefined))
  assert.ok(!isMenuPayload(""))
  assert.ok(!isMenuPayload("Home"))
  assert.ok(!isMenuPayload(CONSENT_ACCEPT_TEXT))
  assert.ok(!isMenuPayload("SW_MENU_NOT_REAL"))
})

/**
 * The assessment message IS the flow now — it is asked as fixed copy with no
 * model call, and the brain's qualification section is written against exactly
 * this shape. Losing a numbered question here does not fail loudly: the model
 * simply never learns that item was asked, and starts asking it separately,
 * which is the one-at-a-time interrogation the whole change removed.
 */
test("the assessment message asks all four questions in one go", () => {
  for (const n of ["1.", "2.", "3.", "4."]) {
    assert.ok(ASSESSMENT_QUESTIONS_TEXT.includes(n), `question ${n} is missing`)
  }
  assert.match(ASSESSMENT_QUESTIONS_TEXT, /electricity bill/i)
  assert.match(ASSESSMENT_QUESTIONS_TEXT, /day or at night/i)
  assert.match(ASSESSMENT_QUESTIONS_TEXT, /goal/i)
  assert.match(ASSESSMENT_QUESTIONS_TEXT, /mobile number/i)
  // Without this line people answer one question per message anyway.
  assert.match(ASSESSMENT_QUESTIONS_TEXT, /one message/i)
  // It must never be mistaken for navigation and intercepted by route.ts.
  assert.ok(!isMenuPayload(ASSESSMENT_QUESTIONS_TEXT))
})

/**
 * The Form is the escape hatch for anyone who would rather not answer in chat,
 * and the URL is duplicated in two other repos (see the constant's comment), so
 * assert the shape rather than let a typo ship a dead link.
 */
test("the Google Form hand-off carries the public form URL", () => {
  assert.ok(GOOGLE_FORM_URL.startsWith("https://docs.google.com/forms/d/e/"))
  assert.ok(GOOGLE_FORM_URL.endsWith("/viewform"))
  assert.ok(FORM_HANDOFF_TEXT.includes(GOOGLE_FORM_URL), "the link has to be in the message")
  // The promise the `chosePaperForm` session flag exists to keep.
  assert.match(FORM_HANDOFF_TEXT, /won't ask you those questions again/i)
})

/**
 * `MENU_FORM` must be intercepted like every other menu tap. Registered in
 * MENU_PAYLOADS but missing from `handleMenu`, it would reach the model as the
 * literal string "SW_MENU_FORM"; offered as a chip but missing from
 * MENU_PAYLOADS, it would do the same. The chip is the only place it appears, so
 * this is the only test that can catch either.
 */
test("the form chip is a recognised menu payload inside Meta's title cap", () => {
  const chips = assessmentQuickReplies()

  assert.equal(chips.length, 1, "the assessment message offers exactly one chip")
  assert.equal(chips[0].payload, MENU_FORM)
  assert.ok(isMenuPayload(chips[0].payload), "MENU_FORM must be registered in MENU_PAYLOADS")
  assert.ok(
    chips[0].title.length <= TITLE_MAX,
    `"${chips[0].title}" is ${chips[0].title.length} chars, over ${TITLE_MAX}`,
  )
  assert.ok(!chips[0].title.endsWith("…"), "the form chip title must not be truncated")
})

/**
 * The reset is the only destructive action the bot exposes, and `MENU_RESET`
 * lives in the persistent menu — reachable in one tap at any moment, including
 * mid-qualification. What makes that safe is that the tap only ASKS: the payload
 * that actually wipes must appear nowhere a visitor can reach without first
 * seeing the confirmation. This test is that guarantee; without it, someone
 * adding a convenient "Start over" chip to the wrong helper turns a mis-tap into
 * a destroyed transcript and consent record.
 */
test("the destructive reset payload is unreachable without confirming", () => {
  const oneTapSurfaces = [
    ...messengerProfilePayload().persistent_menu[0].call_to_actions.map((a) =>
      "payload" in a ? a.payload : "",
    ),
    ...menuQuickReplies().map((r) => r.payload),
    ...assessmentQuickReplies().map((r) => r.payload),
    ...faqQuickReplies().map((r) => r.payload),
    ...repeatLeadQuickReplies().map((r) => r.payload),
  ]

  assert.ok(
    !oneTapSurfaces.includes(MENU_RESET_CONFIRM),
    "MENU_RESET_CONFIRM must only ever be offered by resetConfirmQuickReplies()",
  )
  assert.ok(
    resetConfirmQuickReplies().some((r) => r.payload === MENU_RESET_CONFIRM),
    "the confirmation must actually offer a way through",
  )
  assert.ok(
    resetConfirmQuickReplies().some((r) => r.payload !== MENU_RESET_CONFIRM),
    "a confirmation with no way out is not a confirmation",
  )
})

/** The whole point of the feature: a stuck visitor can always reach it. */
test("start over is reachable from the persistent menu", () => {
  const payloads = messengerProfilePayload().persistent_menu[0].call_to_actions.map((a) =>
    "payload" in a ? a.payload : "",
  )
  assert.ok(payloads.includes(MENU_RESET), "MENU_RESET must stay in the persistent menu")
})

/**
 * English is the bot's default language, and the fixed copy is what sets it. The
 * brain mirrors the language of the visitor's most recent message — and on a
 * menu-started conversation every message before the visitor's first is one of
 * ours, the four assessment questions included, so a single Tagalog string here
 * silently switches the whole thread before the visitor has typed a word. That is exactly how this channel ended up Taglish. Visitor-led
 * switching still happens at runtime; it just may not be seeded from here.
 */
test("fixed Messenger copy is English so the model does not mirror us into Tagalog", () => {
  const markers =
    /\b(po|opo|ninyo|kayo|namin|natin|ako|mga|ang|sa|ng|hindi|sigurado|salamat|kumusta|pasensya|sige|halimbawa|magkano|gaano|pwede|tanong)\b/i

  const copy = [
    GREETING_TEXT,
    MENU_PROMPT,
    HUMAN_HANDOFF_TEXT,
    ALREADY_A_LEAD_TEXT,
    RESET_CONFIRM_TEXT,
    RESET_DONE_TEXT,
    RESET_NOTHING_TEXT,
    ASSESSMENT_QUESTIONS_TEXT,
    ASSESSMENT_UPDATE_PREFACE,
    FORM_HANDOFF_TEXT,
    workAndPricingText(SITE),
    ...Object.values(MENU_TITLES),
    ...assessmentQuickReplies().map((r) => r.title),
    ...FAQ_STARTERS.flatMap((f) => [f.title, f.question]),
  ]

  for (const text of copy) {
    const hit = markers.exec(text)
    assert.ok(!hit, `fixed copy is not English — found "${hit?.[0]}" in: ${text.slice(0, 80)}`)
  }
})

test("work and pricing copy links the marketing site, not the platform", () => {
  const text = workAndPricingText(SITE)
  assert.ok(text.includes(`${SITE}/our-work`))
  assert.ok(text.includes(`${SITE}/solar-solutions`))
})

/**
 * The bill brackets are the one choice list written specifically for Messenger's
 * chip row, so they are the likeliest to be edited without the 20-char cap in
 * mind. `render.test.ts` already walks every CHOICE_FIELDS option, but this
 * asserts the intent directly: the peso sign and the en-dash are multi-byte, and
 * it is easy to assume "₱10,000 – ₱20,000" is shorter than it is.
 */
test("monthly bill brackets fit a Messenger chip and keep an escape hatch", () => {
  const replies = renderChoice("monthlyBill", MONTHLY_BILL_RANGES)

  assert.equal(replies.length, MONTHLY_BILL_RANGES.length, "a bracket was dropped")
  for (const reply of replies) {
    assert.ok(
      reply.title.length <= TITLE_MAX,
      `bracket "${reply.title}" is ${reply.title.length} chars, over ${TITLE_MAX}`,
    )
    assert.ok(!reply.title.endsWith("…"), `bracket "${reply.title}" was truncated`)
  }

  // Without a "not sure" option the only honest answer for someone who doesn't
  // know their bill is to abandon the flow.
  assert.ok(
    MONTHLY_BILL_RANGES.some((r) => /sigurado|not sure/i.test(r)),
    "the bill brackets must keep an 'unsure' escape hatch",
  )
})

/**
 * The bill question is asked two ways — chips here, a typed figure on the web
 * form — and `collectedFields` scans the transcript by LABEL. If the two ever
 * carry different labels, a visitor who taps a bracket is asked for their bill a
 * second time by the form, which is exactly the repetition the whole design
 * exists to prevent.
 */
test("the bill choice and the bill text field share one label", () => {
  assert.equal(CHOICE_FIELDS.monthlyBill.label, DETAIL_FIELDS.monthlyBill.label)
})

/**
 * Canonical options are DATA, not conversation. The assistant mirrors the
 * visitor's language in prose, but these strings are matched verbatim by
 * `collectedFields` and read by the sales team in the dashboard — so they must
 * stay in one language. This caught a real regression: a Tagalog "Hindi ko
 * sigurado" bracket slipped in among otherwise-English options.
 */
test("canonical choice options stay in one language", () => {
  const tagalogMarkers = /\b(po|opo|hindi|sigurado|halimbawa|kayo|ninyo|ang|ng|sa)\b/i

  for (const field of CHOICE_FIELD_KEYS) {
    for (const option of CHOICE_FIELDS[field].options) {
      assert.ok(
        !tagalogMarkers.test(option),
        `option "${option}" on ${field} is not English — canonical options are stored and matched verbatim`,
      )
    }
  }
})

/** Worked examples must be concrete, or they teach the visitor nothing. */
test("format examples show a real shape, not a restated label", () => {
  assert.ok(FORMAT_EXAMPLES.location.split(",").length >= 3, "location needs barangay, town, province")
  assert.ok(/@/.test(FORMAT_EXAMPLES.email))
  assert.ok(/\d/.test(FORMAT_EXAMPLES.mobile))
})
