import { test } from "node:test"
import assert from "node:assert/strict"

import {
  buildUi,
  cleanAttribution,
  collectedFields,
  collectedFieldsNote,
  normalizeFieldName,
  recoverToolCall,
  resolveChoiceField,
  retryAfterFrom,
  salvageLeakedUi,
  uiFromProse,
  type ChatMessage,
} from "./brain"
import { normalizePhMobile } from "./vocab"

/**
 * Unit tests for the chat brain's pure helpers.
 *
 * These had no coverage at all while the brain lived in the marketing app's
 * route handler, and almost every one of them exists because of a specific
 * production failure — leaked tool syntax shown to a visitor, a snake_case field
 * name that silently dropped a chip block, "about 928 seconds", "x" accepted as
 * a phone number. The assertions below are those bugs, written down.
 *
 * Nothing here touches the network, the database or `lib/env.ts`: the brain
 * reaches the provider, the KB and the leads writer through `await import(...)`
 * inside async functions precisely so this file can run under a bare
 * `node --test` with no secrets present.
 */

// --- salvageLeakedUi --------------------------------------------------------

test("salvageLeakedUi strips a leaked tool line and recovers the block", () => {
  const { ui, cleaned } = salvageLeakedUi(
    "Happy to help with that.\nask_choice: property_type, What kind of property?",
  )

  assert.equal(cleaned, "Happy to help with that.")
  // The visitor must never see the tool name; the chips take its place.
  assert.equal(ui?.kind, "choice")
  assert.equal(ui?.kind === "choice" && ui.field, "propertyType")
})

test("salvageLeakedUi still yields a block when the reply is ONLY leaked syntax", () => {
  // Regression: stripping the line left an empty message, and the widget renders
  // its "something went wrong" line for that — which is what the visitor saw.
  const { ui, cleaned } = salvageLeakedUi("request_consent: your name, mobile and location")

  assert.equal(cleaned, "")
  assert.equal(ui?.kind, "consent")
})

test("salvageLeakedUi drops a leaked save_lead without ever saving from prose", () => {
  const { ui, cleaned } = salvageLeakedUi('Thanks!\nsave_lead: {"fullName": "Juan"}')

  assert.equal(cleaned, "Thanks!")
  // A real save must come through the tool channel, never out of the reply text.
  assert.equal(ui, null)
})

test("salvageLeakedUi handles the malformed <function=…> wire format", () => {
  const { ui, cleaned } = salvageLeakedUi("<function=request_consent> your details</function>")

  assert.equal(cleaned, "")
  assert.equal(ui?.kind, "consent")
})

test("salvageLeakedUi leaves an ordinary reply untouched", () => {
  const prose = "Panels carry a 20-year warranty.\nWould you like an assessment?"
  const { ui, cleaned } = salvageLeakedUi(prose)

  assert.equal(cleaned, prose)
  assert.equal(ui, null)
})

// --- uiFromProse ------------------------------------------------------------

test("uiFromProse parses `ask_choice: property_type, What kind of property?`", () => {
  const ui = uiFromProse("ask_choice", "property_type, What kind of property?")

  assert.equal(ui?.kind, "choice")
  if (ui?.kind !== "choice") return
  assert.equal(ui.field, "propertyType")
  assert.equal(ui.question, "What kind of property?")
  // Options are canonical and server-supplied — the model only picks the field.
  assert.deepEqual(ui.options, ["Home", "Farm", "Resort", "School", "Office", "Commercial", "Other"])
  assert.equal(ui.multi, false)
})

test("uiFromProse rejects an unknown field rather than inventing a block", () => {
  assert.equal(uiFromProse("ask_choice", "roof_material, What is your roof made of?"), null)
})

test("uiFromProse collects detail fields and drops unknown ones", () => {
  const ui = uiFromProse("collect_details", "full_name, mobile, favourite_colour")

  assert.equal(ui?.kind, "details")
  assert.deepEqual(ui?.kind === "details" && ui.fields, ["fullName", "mobile"])
})

test("uiFromProse yields no details block when nothing is recognisable", () => {
  assert.equal(uiFromProse("collect_details", "whatever, nonsense"), null)
})

// --- buildUi ----------------------------------------------------------------

test("buildUi resolves a snake_case field name to the canonical key", () => {
  // The model very often sends `property_type`; an unresolved field used to
  // silently drop the whole chip block.
  const ui = buildUi("ask_choice", JSON.stringify({ field: "property_type", question: "Which one?" }))

  assert.equal(ui?.kind === "choice" && ui.field, "propertyType")
})

test("buildUi ignores model-supplied options and uses the canonical list", () => {
  const ui = buildUi(
    "ask_choice",
    JSON.stringify({ field: "contactMethod", question: "How should we reach you?", options: ["Telegram"] }),
  )

  assert.equal(ui?.kind, "choice")
  // A hallucinated option must never reach the visitor or the lead.
  assert.deepEqual(ui?.kind === "choice" && ui.options, ["Call", "Viber", "WhatsApp", "Email"])
})

test("buildUi returns null for an unknown field so the turn falls back to prose", () => {
  assert.equal(buildUi("ask_choice", JSON.stringify({ field: "roofAngle", question: "?" })), null)
})

test("buildUi returns null on unparseable arguments", () => {
  assert.equal(buildUi("ask_choice", "{not json"), null)
})

test("buildUi de-duplicates and filters collect_details fields", () => {
  const ui = buildUi(
    "collect_details",
    JSON.stringify({ question: "A few details", fields: ["fullName", "fullName", "nickname", "city"] }),
  )

  assert.equal(ui?.kind, "details")
  assert.deepEqual(ui?.kind === "details" && ui.fields, ["fullName", "city"])
})

test("buildUi returns null when collect_details asks for nothing usable", () => {
  assert.equal(buildUi("collect_details", JSON.stringify({ fields: ["nickname"] })), null)
})

test("buildUi builds a consent block from the summary", () => {
  const ui = buildUi("request_consent", JSON.stringify({ summary: "your name, mobile and location" }))

  assert.deepEqual(ui, { kind: "consent", summary: "your name, mobile and location" })
})

// --- field-name normalisation -----------------------------------------------

test("normalizeFieldName camelCases the shapes the model actually emits", () => {
  assert.equal(normalizeFieldName("property_type"), "propertyType")
  assert.equal(normalizeFieldName("property type"), "propertyType")
  assert.equal(normalizeFieldName("PropertyType"), "propertyType")
  assert.equal(normalizeFieldName("  primary-goal "), "primaryGoal")
})

test("resolveChoiceField accepts the four qualification fields and nothing else", () => {
  assert.equal(resolveChoiceField("solution_interest"), "solutionInterest")
  assert.equal(resolveChoiceField("contactMethod"), "contactMethod")
  assert.equal(resolveChoiceField("budget"), null)
})

// --- collectedFields --------------------------------------------------------

test("collectedFields reads label-prefixed answers across a whole transcript", () => {
  const history: ChatMessage[] = [
    { role: "assistant", content: "What kind of property is it?" },
    { role: "user", content: "Property type: Home" },
    { role: "assistant", content: "And how should we reach you?" },
    { role: "user", content: "Full name: Juan Dela Cruz\nMobile number: 0917 555 0142\nCity / Municipality: Lipa" },
  ]

  const found = collectedFields(history)
  assert.equal(found.get("Property type"), "Home")
  assert.equal(found.get("Full name"), "Juan Dela Cruz")
  assert.equal(found.get("Mobile number"), "0917 555 0142")
  assert.equal(found.get("City / Municipality"), "Lipa")
  assert.equal(found.size, 4)
})

test("collectedFields ignores assistant lines, unknown labels and empty values", () => {
  const found = collectedFields([
    // The assistant echoing a label back must not count as an answer.
    { role: "assistant", content: "Property type: Home" },
    { role: "user", content: "Favourite colour: blue" },
    { role: "user", content: "Property type:" },
    { role: "user", content: "no colon here" },
  ])

  assert.equal(found.size, 0)
})

test("collectedFields keeps the visitor's latest answer for a field", () => {
  const found = collectedFields([
    { role: "user", content: "Primary goal: Lower my bill" },
    { role: "user", content: "Primary goal: Both" },
  ])

  assert.equal(found.get("Primary goal"), "Both")
})

// --- collectedFieldsNote ----------------------------------------------------

test("collectedFieldsNote stays silent when there is nothing to say", () => {
  assert.equal(collectedFieldsNote(new Map(), false, false), null)
})

test("collectedFieldsNote makes the ticked checkbox, not the model, decide", () => {
  // Without this the model asked for consent again and again after the visitor
  // had already ticked the box.
  const note = collectedFieldsNote(new Map([["Full name", "Juan"]]), true, false)
  assert.match(note ?? "", /call save_lead NOW/)

  const saved = collectedFieldsNote(new Map([["Full name", "Juan"]]), true, true)
  assert.match(saved ?? "", /ALREADY been saved/)
})

test("collectedFieldsNote names what is still missing before consent", () => {
  const note = collectedFieldsNote(new Map([["Full name", "Juan"]]), false, false)

  assert.match(note ?? "", /Still needed:/)
  assert.match(note ?? "", /Mobile number/)
  // And it states what it already has, so the model stops re-asking.
  assert.match(note ?? "", /- Full name: Juan/)
})

// --- retryAfterFrom ---------------------------------------------------------

test("retryAfterFrom reads a plain seconds hint out of the error body", () => {
  assert.equal(retryAfterFrom(new Headers(), "Please try again in 9.975s"), 9_975)
})

test("retryAfterFrom reads minutes AND seconds — the exhausted-day case", () => {
  // "8m6.864s" means the daily budget is gone; parsing only the seconds part
  // would report 6.9s and send the visitor straight back into a 429.
  assert.equal(retryAfterFrom(new Headers(), "Please try again in 8m6.864s"), 486_864)
})

test("retryAfterFrom prefers the body over a bare retry-after header", () => {
  // The header was observed carrying 928, which we reported to a visitor as
  // "about 928 seconds" while the body said the wait was under ten.
  const headers = new Headers({ "retry-after": "928" })
  assert.equal(retryAfterFrom(headers, "Please try again in 9.975s"), 9_975)
})

test("retryAfterFrom falls back to the retry-after header, then to a default", () => {
  assert.equal(retryAfterFrom(new Headers({ "retry-after": "928" }), ""), 928_000)
  assert.equal(retryAfterFrom(new Headers(), "some other 429 wording"), 5_000)
  assert.equal(retryAfterFrom(new Headers({ "retry-after": "nonsense" }), ""), 5_000)
})

// --- recoverToolCall --------------------------------------------------------

test("recoverToolCall lifts the intended call out of a failed_generation blob", () => {
  const recovered = recoverToolCall('<function=ask_choice{"field": "propertyType"}</function>')

  assert.equal(recovered?.name, "ask_choice")
  assert.deepEqual(JSON.parse(recovered?.arguments ?? "null"), { field: "propertyType" })
})

test("recoverToolCall gives up on unparseable arguments rather than guessing", () => {
  assert.equal(recoverToolCall("<function=ask_choice{field: broken}</function>"), null)
  assert.equal(recoverToolCall("just some prose"), null)
})

// --- attribution ------------------------------------------------------------

test("cleanAttribution keeps only the whitelisted keys (L-04)", () => {
  const cleaned = cleanAttribution({
    utm_source: " facebook ",
    utm_campaign: "solar-2026",
    // A hostile client must not be able to stuff the lead document.
    role: "superadmin",
    notes: "x",
  })

  assert.deepEqual(cleaned, { utm_source: "facebook", utm_campaign: "solar-2026" })
})

test("cleanAttribution tolerates junk input", () => {
  assert.deepEqual(cleanAttribution(null), {})
  assert.deepEqual(cleanAttribution("nope"), {})
  assert.deepEqual(cleanAttribution({ utm_source: 42 }), {})
})

// --- phone normalisation ----------------------------------------------------

test("normalizePhMobile accepts every shape a Philippine mobile arrives in", () => {
  assert.equal(normalizePhMobile("+63 917 555 0142"), "09175550142")
  assert.equal(normalizePhMobile("63917 555 0142"), "09175550142")
  assert.equal(normalizePhMobile("917-555-0142"), "09175550142")
  assert.equal(normalizePhMobile("0917 555 0142"), "09175550142")
  assert.equal(normalizePhMobile("(0917) 555 0142"), "09175550142")
})

test("normalizePhMobile rejects anything that isn't one", () => {
  // Regression: any non-empty string used to pass, so "x" counted as a number
  // and reached the sales inbox as a lead nobody could call.
  assert.equal(normalizePhMobile("x"), null)
  assert.equal(normalizePhMobile(""), null)
  assert.equal(normalizePhMobile("0917 555 014"), null)
  assert.equal(normalizePhMobile("08175550142"), null)
})
