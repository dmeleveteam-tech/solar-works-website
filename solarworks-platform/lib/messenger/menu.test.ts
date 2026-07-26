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
  ASSESSMENT_OPENER,
  ASSESSMENT_UPDATE_OPENER,
  FAQ_STARTERS,
  MENU_PAYLOADS,
  PERSISTENT_MENU_MAX,
  faqQuickReplies,
  isMenuPayload,
  menuQuickReplies,
  messengerProfilePayload,
  repeatLeadQuickReplies,
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
  const sets = [menuQuickReplies(), faqQuickReplies(), repeatLeadQuickReplies()]

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
  const actions = messengerProfilePayload(SITE).persistent_menu[0].call_to_actions

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

test("assessment openers read as the visitor speaking, not as a payload", () => {
  for (const opener of [ASSESSMENT_OPENER, ASSESSMENT_UPDATE_OPENER]) {
    assert.ok(!isMenuPayload(opener), "an opener must not be re-intercepted as navigation")
    assert.ok(opener.length > 20, "an opener should be a sentence the model can act on")
  }
  assert.notEqual(ASSESSMENT_OPENER, ASSESSMENT_UPDATE_OPENER)
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
