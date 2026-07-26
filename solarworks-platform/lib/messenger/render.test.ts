import { test } from "node:test"
import assert from "node:assert/strict"

import {
  CHOICE_FIELDS,
  CHOICE_FIELD_KEYS,
  CONSENT_ACCEPT_TEXT,
  CONSENT_DECLINE_TEXT,
  formatChoiceAnswer,
} from "../chat/vocab"
import {
  PAYLOAD_MAX,
  QUICK_REPLY_MAX,
  SHORT_TITLES,
  TITLE_MAX,
  renderChatUi,
  renderChoice,
  renderConsent,
} from "./render"

/**
 * The guard test below is the reason this file exists. Meta rejects a message
 * whose quick-reply title exceeds 20 characters or whose option count exceeds
 * 13 — it does not truncate or drop the extras, the whole send fails — so an
 * option added to `vocab.ts` for the web widget could take the Messenger bot
 * offline for that question with nothing failing at build time. Walking every
 * canonical option here turns that into a red test.
 */

test("every canonical option renders inside Meta's quick-reply limits", () => {
  for (const field of CHOICE_FIELD_KEYS) {
    const options = CHOICE_FIELDS[field].options
    const replies = renderChoice(field, options)

    assert.ok(
      options.length <= QUICK_REPLY_MAX,
      `${field} has ${options.length} options, over Meta's cap of ${QUICK_REPLY_MAX}`,
    )
    assert.equal(replies.length, options.length, `${field} lost options in rendering`)

    for (const [i, reply] of replies.entries()) {
      const option = options[i]
      assert.ok(
        reply.title.length <= TITLE_MAX,
        `${field} option "${option}" renders a ${reply.title.length}-char title ` +
          `("${reply.title}"); add a SHORT_TITLES entry`,
      )
      assert.ok(reply.title.length > 0, `${field} option "${option}" rendered an empty title`)
      // The payload is what reaches the transcript, so it must be exactly what
      // the brain's collectedFields scanner and save_lead already accept.
      assert.equal(
        reply.payload,
        formatChoiceAnswer(field, option),
        `${field} option "${option}" would not round-trip to the brain`,
      )
      assert.ok(reply.payload.length <= PAYLOAD_MAX)
      assert.equal(reply.content_type, "text")
    }
  }
})

test("SHORT_TITLES covers exactly the options that overflow, and nothing else", () => {
  const canonical: string[] = CHOICE_FIELD_KEYS.flatMap((f) => [...CHOICE_FIELDS[f].options])
  const overflowing = canonical.filter((o) => o.length > TITLE_MAX)

  // Audited at time of writing: only "Business operating cost" (23) overflows.
  // "Hybrid with Battery" (19) fits with one character to spare.
  assert.deepEqual(overflowing, ["Business operating cost"])

  for (const option of overflowing) {
    assert.ok(SHORT_TITLES[option], `no SHORT_TITLES entry for "${option}"`)
  }
  // A stale override is its own bug: the chip would say something the option no
  // longer does.
  for (const key of Object.keys(SHORT_TITLES)) {
    assert.ok(canonical.includes(key), `SHORT_TITLES has "${key}", which is no longer an option`)
  }
})

test("a choice block renders the question with canonical payloads", () => {
  const rendered = renderChatUi({
    kind: "choice",
    field: "primaryGoal",
    question: "Ano po ang pangunahing dahilan?",
    options: ["Lower my bill", "Business operating cost"],
    multi: false,
  })

  assert.equal(rendered.text, "Ano po ang pangunahing dahilan?")
  assert.deepEqual(rendered.quickReplies, [
    { content_type: "text", title: "Lower my bill", payload: "Primary goal: Lower my bill" },
    {
      content_type: "text",
      title: "Business costs",
      payload: "Primary goal: Business operating cost",
    },
  ])
})

test("a choice block with no options falls back to the canonical list", () => {
  const rendered = renderChatUi({
    kind: "choice",
    field: "contactMethod",
    question: "Paano po kayo tawagan?",
    options: [],
    multi: false,
  })
  assert.equal(rendered.quickReplies?.length, CHOICE_FIELDS.contactMethod.options.length)
})

test("more options than Meta allows are capped rather than failing the send", () => {
  const many = Array.from({ length: 20 }, (_, i) => `Option ${i}`)
  assert.equal(renderChoice("propertyType", many).length, QUICK_REPLY_MAX)
})

test("consent payloads are the canonical strings, verbatim", () => {
  const replies = renderConsent()

  // The brain force-saves the lead on an exact match of the accept string. Any
  // drift here — a stray full stop, a curly dash — silently stops consented
  // Messenger leads from ever being written, with no error anywhere.
  assert.equal(replies[0].payload, CONSENT_ACCEPT_TEXT)
  assert.equal(replies[1].payload, CONSENT_DECLINE_TEXT)
  assert.equal(replies[0].title, "Yes, I agree")
  assert.equal(replies[1].title, "Not now")

  for (const reply of replies) {
    assert.ok(reply.title.length <= TITLE_MAX)
    assert.ok(reply.payload.length <= PAYLOAD_MAX)
  }
})

test("a consent block renders the summary as its text", () => {
  const rendered = renderChatUi({ kind: "consent", summary: "Ito po ang mga detalye ninyo…" })
  assert.equal(rendered.text, "Ito po ang mga detalye ninyo…")
  assert.equal(rendered.quickReplies?.length, 2)
  assert.equal(rendered.quickReplies?.[0].payload, CONSENT_ACCEPT_TEXT)
})

test("a details block degrades to plain text naming the first field", () => {
  // The brain withholds collect_details on this channel, so arriving here means
  // the model went off-script. The turn must still say something.
  const rendered = renderChatUi({
    kind: "details",
    question: "Pakisend po ang inyong contact details.",
    fields: ["fullName", "mobile"],
  })

  assert.equal(rendered.quickReplies, undefined)
  assert.match(rendered.text, /Pakisend po ang inyong contact details\./)
  assert.match(rendered.text, /Full name/)
})

test("the consent strings never collide with a choice payload", () => {
  // Both arrive on the same wire as plain user text, so an overlap would make
  // the forced save fire on an ordinary chip tap.
  const payloads = CHOICE_FIELD_KEYS.flatMap((f) =>
    renderChoice(f, CHOICE_FIELDS[f].options).map((r) => r.payload),
  )
  assert.ok(!payloads.includes(CONSENT_ACCEPT_TEXT))
  assert.ok(!payloads.includes(CONSENT_DECLINE_TEXT))
})
