import {
  CHOICE_FIELDS,
  CONSENT_ACCEPT_TEXT,
  CONSENT_DECLINE_TEXT,
  DETAIL_FIELDS,
  formatChoiceAnswer,
  type ChatUi,
  type ChoiceField,
} from "../chat/vocab"

/**
 * `ChatUi` → Messenger payload.
 *
 * The whole design turns on one asymmetry in Meta's quick-reply schema: `title`
 * is capped at 20 characters and 13 options, but the separate `payload` field
 * allows 1000. So the two carry different things:
 *
 *   title   — short display text, what the visitor sees on the chip
 *   payload — the canonical LABELLED string the brain already expects, e.g.
 *             "Primary goal: Cut bill by ~50%" or the verbatim consent
 *             acceptance
 *
 * The webhook feeds the payload (never the title) into the transcript as an
 * ordinary user message, so `collectedFields` and the forced-save-on-consent
 * path in the brain keep working with no Messenger-specific branch at all. The
 * title alone would not do: it carries no field name, so a bare "Not sure"
 * could answer either the bill bracket or the daytime/night question and
 * `collectedFields` would credit neither — the model would then re-ask both
 * every turn. It is also free to be shortened for display (see `SHORT_TITLES`),
 * which the canonical match cannot tolerate.
 *
 * No `server-only` and no network access — plain data transformation, so the
 * guard test in render.test.ts can walk every canonical option.
 */

/** A Messenger quick reply. `content_type: "text"` is the only kind we emit. */
export type QuickReply = {
  content_type: "text"
  title: string
  payload: string
}

/** What `renderChatUi` hands to `send.ts`. */
export type MessengerRender = {
  text: string
  quickReplies?: QuickReply[]
}

/** Meta's hard caps. Exceeding either makes the whole send fail, not degrade. */
export const TITLE_MAX = 20
export const QUICK_REPLY_MAX = 13
export const PAYLOAD_MAX = 1000

/**
 * Display-only short forms for canonical options that don't fit in 20 chars.
 *
 * Currently EMPTY, and that is a fact about `vocab.ts`, not a decision to stop
 * using this mechanism. Its one entry mapped "Business operating cost" (23) to
 * "Business costs"; that option went away when `PRIMARY_GOALS` was rewritten
 * into the four ≤20-char goals the assessment now asks, and every remaining
 * canonical option fits unaided. Several fit only just — "Fix brownout issues"
 * (19) and "Hybrid with Battery" (19) each have one character to spare — which
 * is exactly why the guard test in render.test.ts walks all of them: a one-word
 * edit to `vocab.ts` would push one over and break Messenger silently.
 *
 * Keys are the canonical option text; the payload always keeps the canonical
 * form, so shortening here can never reach the lead. Add an entry the moment
 * that test tells you an option overflows.
 */
export const SHORT_TITLES: Record<string, string> = {}

/** The chip label for a canonical option: the override, else the option itself. */
export function shortTitle(option: string): string {
  const short = SHORT_TITLES[option] ?? option
  // Belt and braces: an option added to vocab.ts without an entry above would
  // otherwise make Meta reject the entire message. Truncating is wrong-looking
  // but still functional; the guard test is what stops it happening at all.
  return short.length <= TITLE_MAX ? short : `${short.slice(0, TITLE_MAX - 1).trimEnd()}…`
}

function quickReply(title: string, payload: string): QuickReply {
  return {
    content_type: "text",
    title: shortTitle(title),
    payload: payload.length <= PAYLOAD_MAX ? payload : payload.slice(0, PAYLOAD_MAX),
  }
}

/** Quick replies for a choice block: canonical payloads, shortened titles. */
export function renderChoice(field: ChoiceField, options: readonly string[]): QuickReply[] {
  return options
    .slice(0, QUICK_REPLY_MAX)
    .map((option) => quickReply(option, formatChoiceAnswer(field, option)))
}

/**
 * The consent pair.
 *
 * The payloads are `CONSENT_ACCEPT_TEXT` / `CONSENT_DECLINE_TEXT` VERBATIM. The
 * brain force-saves the lead when it sees the accept string exactly — that turn
 * is the one place saving is not left to the model — so any drift here (an added
 * full stop, a curly quote) silently stops consented Messenger leads from ever
 * being written, with no error anywhere. The guard test asserts the identity.
 */
export function renderConsent(): QuickReply[] {
  return [
    quickReply("Yes, I agree", CONSENT_ACCEPT_TEXT),
    quickReply("Not now", CONSENT_DECLINE_TEXT),
  ]
}

export function renderChatUi(ui: ChatUi): MessengerRender {
  if (ui.kind === "choice") {
    const field = ui.field
    const options = ui.options.length ? ui.options : [...CHOICE_FIELDS[field].options]
    return { text: ui.question, quickReplies: renderChoice(field, options) }
  }

  if (ui.kind === "consent") {
    return { text: ui.summary, quickReplies: renderConsent() }
  }

  // `details` should never reach this channel: the brain withholds the
  // `collect_details` tool for `channel: "messenger"` because there is no
  // multi-field form to render, and instructs the model to ask contact fields
  // one at a time instead. If one arrives anyway the model has gone off-script,
  // so degrade to plain text asking for the first field rather than dropping the
  // turn — a visitor staring at a bot that said nothing is the worse failure.
  const first = ui.fields[0]
  const label = first ? DETAIL_FIELDS[first].label : "contact details"
  console.warn(
    `[messenger] unexpected details block on this channel (fields: ${ui.fields.join(", ")})`,
  )
  return { text: `${ui.question}\n\nPakisend na lang po dito: ${label}.` }
}
