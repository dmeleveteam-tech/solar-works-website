import { CHOICE_FIELDS } from "../chat/vocab"
import { siteFacts } from "../chat/site-facts"
import { shortTitle, type QuickReply } from "./render"

/**
 * The bot's navigable entry points: the Get Started button, the persistent menu,
 * and the quick-reply equivalents shown inside the thread.
 *
 * WHY POSTBACK PAYLOADS AND NOT PLAIN TEXT. Everything else in this channel
 * deliberately reaches the brain as ordinary user text (see the header of
 * `render.ts`) — a tapped chip is indistinguishable from typing. The menu is the
 * one exception: these four actions are NAVIGATION, not answers to a question
 * the model asked. Feeding "Talk to a human" into the transcript as a user turn
 * would have the model treat it as conversational input and try to answer it,
 * which is exactly the wrong response to a request to stop talking to the bot.
 *
 * So menu payloads use a reserved `SW_MENU_*` namespace that `route.ts`
 * intercepts BEFORE the model call. The namespace prefix matters: a visitor who
 * literally types "SW_MENU_HUMAN" would otherwise trigger the branch, and more
 * realistically it keeps these strings from ever colliding with a canonical
 * option in `vocab.ts`.
 *
 * ASSESSMENT IS THE DELIBERATE EXCEPTION. It resolves to a canonical sentence
 * that IS fed to the brain, because starting a qualification flow is precisely
 * what the model should do with it — no bespoke state machine, no second
 * implementation of the flow that already works.
 *
 * No `server-only` and no network access — plain data, so the guard tests can
 * walk every entry.
 */

export const MENU_ASSESSMENT = "SW_MENU_ASSESSMENT"
export const MENU_ASSESSMENT_UPDATE = "SW_MENU_ASSESSMENT_UPDATE"
export const MENU_FAQ = "SW_MENU_FAQ"
export const MENU_HUMAN = "SW_MENU_HUMAN"
export const MENU_WORK = "SW_MENU_WORK"
/**
 * Start over: wipe the thread's stored state and run a fresh assessment.
 *
 * TWO payloads, not one, and the split is the whole safety story. `MENU_RESET`
 * only ASKS; `MENU_RESET_CONFIRM` is the only thing that actually clears. The
 * entry point sits in the persistent menu, which is one tap away at every moment
 * of every conversation — including halfway through a qualification — so a
 * single-payload reset would let one mis-tap silently destroy a transcript and a
 * consent record with no way back. Keep them separate, and keep the confirm
 * payload out of the persistent menu.
 */
export const MENU_RESET = "SW_MENU_RESET"
export const MENU_RESET_CONFIRM = "SW_MENU_RESET_CONFIRM"
/** Meta's own reserved payload for the Get Started button. */
export const GET_STARTED = "SW_GET_STARTED"

export const MENU_PAYLOADS = [
  MENU_ASSESSMENT,
  MENU_ASSESSMENT_UPDATE,
  MENU_FAQ,
  MENU_HUMAN,
  MENU_WORK,
  MENU_RESET,
  MENU_RESET_CONFIRM,
  GET_STARTED,
] as const

export type MenuPayload = (typeof MENU_PAYLOADS)[number]

/** True when a payload is ours to intercept rather than feed to the model. */
export function isMenuPayload(payload: string | undefined): payload is MenuPayload {
  return !!payload && (MENU_PAYLOADS as readonly string[]).includes(payload)
}

/**
 * The sentence a menu tap becomes when it DOES go to the model.
 *
 * Phrased as the visitor speaking, in the same register the brain expects, so
 * the model reads it as an ordinary opening turn.
 *
 * ENGLISH, like all fixed copy in this file — and it is load-bearing here in a
 * way the rest is not. The brain mirrors the language of the visitor's most
 * recent message, and on the first turn of a menu-started conversation THIS is
 * that message. A Taglish opener therefore told the model "this visitor writes
 * Taglish" before the visitor had typed a word, which is how the whole thread
 * ended up in Taglish regardless of who was on the other end.
 */
export const ASSESSMENT_OPENER =
  "I'd like to start a solar assessment for my property."

/**
 * Re-engagement opener for someone we already hold a lead for.
 *
 * It names the situation explicitly so the model confirms what we have instead
 * of re-interrogating from scratch — the difference between "welcome back, is
 * this still the right number?" and a second identical lead in the sales inbox.
 */
export const ASSESSMENT_UPDATE_OPENER =
  "I enquired with you before. I'd just like to update my details."

/**
 * Opener after a reset. Distinct from `ASSESSMENT_OPENER` on purpose: the
 * visitor has just been told the thread was cleared, so the model must not open
 * with "welcome back" or refer to anything it can no longer see. Saying "from
 * scratch" out loud is what keeps it from hallucinating continuity.
 */
export const ASSESSMENT_RESTART_OPENER =
  "Let's start over from scratch. I'd like a fresh solar assessment for my property."

// --- copy ---------------------------------------------------------------------

export const MENU_TITLES = {
  [MENU_ASSESSMENT]: "Start assessment",
  [MENU_FAQ]: "Ask a question",
  [MENU_HUMAN]: "Talk to a human",
  [MENU_WORK]: "Our work & pricing",
  [MENU_RESET]: "Start over",
} as const

export const GREETING_TEXT =
  "Hi! I'm the Solar Assistant for Solar Works ☀️ I can help you work out how much you could save by going solar. Tap Get Started to begin."

export const MENU_PROMPT = "What can I help you with today?"

export const HUMAN_HANDOFF_TEXT = `Of course — I'll pass this to our team. You can also reach us directly:\n\n📞 Call / Viber: ${siteFacts.contact.phone}\n✉️ Email: ${siteFacts.contact.email}\n\nFeel free to keep replying here if you have more questions — our team will get back to you during business hours.`

export const ALREADY_A_LEAD_TEXT =
  "Thanks — we already have your details from earlier. Would you like to update them, start over with a fresh assessment, or ask a question?"

/**
 * Shown BEFORE anything is cleared. It has one job beyond confirming: say what
 * a reset does not touch. An inquiry already handed to the sales team is a
 * business record and stays (the same reasoning as the data-deletion callback),
 * and a visitor who taps "Start over" expecting that to withdraw it would be
 * misled by silence.
 */
export const RESET_CONFIRM_TEXT =
  "Just to confirm — starting over clears our conversation here and begins a brand-new assessment. Any inquiry you've already sent to our team stays with them. Shall I go ahead?"

/** Sent the moment the wipe lands, so the visitor sees the tap took effect. */
export const RESET_DONE_TEXT = "Done — we're starting fresh. 🔄"

/** Sent when "Start over" is tapped on a thread with nothing to clear. */
export const RESET_NOTHING_TEXT = "Nothing to clear yet — let's get started."

/**
 * Answers a link, not prose: the site already says this better than the bot can,
 * and a Messenger thread is a bad place to paste a project portfolio.
 */
export function workAndPricingText(siteUrl: string): string {
  const areas = siteFacts.serviceAreas.join(", ")
  return `Here are some of the systems we've built and our pricing guide:\n\n🔧 Projects: ${siteUrl}/our-work\n💡 Solutions and pricing: ${siteUrl}/solar-solutions\n\nWe cover ${areas}. Every system includes ${siteFacts.warranties.panel} and ${siteFacts.warranties.support}.`
}

/**
 * The starter questions offered after "Ask a question".
 *
 * These are plain text payloads on purpose — unlike the menu itself, each IS a
 * real question the model should answer from the knowledge base, so it goes into
 * the transcript exactly as if typed. Titles are capped at Meta's 20 characters
 * by `shortTitle`; the payload carries the full question.
 */
export const FAQ_STARTERS: { title: string; question: string }[] = [
  { title: "How much is solar?", question: "How much does a solar system cost for a home?" },
  { title: "Monthly savings?", question: "How much could I save on my electricity bill each month?" },
  { title: "Installation time?", question: "How long does a solar installation take?" },
  { title: "What warranty?", question: "What warranty comes with your panels and batteries?" },
  { title: "Any financing?", question: "Do you offer financing or installment options?" },
]

// --- quick replies -------------------------------------------------------------

function quickReply(title: string, payload: string): QuickReply {
  return { content_type: "text", title: shortTitle(title), payload }
}

/** The four navigation options, as in-thread chips. */
export function menuQuickReplies(): QuickReply[] {
  return [
    quickReply(MENU_TITLES[MENU_ASSESSMENT], MENU_ASSESSMENT),
    quickReply(MENU_TITLES[MENU_FAQ], MENU_FAQ),
    quickReply(MENU_TITLES[MENU_WORK], MENU_WORK),
    quickReply(MENU_TITLES[MENU_HUMAN], MENU_HUMAN),
  ]
}

/** Starter questions after "Ask a question", plus a way back to the menu. */
export function faqQuickReplies(): QuickReply[] {
  return [
    ...FAQ_STARTERS.map((f) => quickReply(f.title, f.question)),
    quickReply("Start assessment", MENU_ASSESSMENT),
  ]
}

/**
 * The returning-visitor fork: amend what we hold, replace it, or just ask
 * something.
 *
 * "Update my details" and "Start over" look similar and are not. Update keeps
 * the transcript and the consent record and asks the model to confirm what we
 * already have; start over throws all of it away and re-qualifies from nothing.
 * Update is listed first because it is right far more often — a second property
 * or a genuinely stale record is the exception.
 */
export function repeatLeadQuickReplies(): QuickReply[] {
  return [
    quickReply("Update my details", MENU_ASSESSMENT_UPDATE),
    quickReply(MENU_TITLES[MENU_RESET], MENU_RESET),
    quickReply(MENU_TITLES[MENU_FAQ], MENU_FAQ),
    quickReply(MENU_TITLES[MENU_HUMAN], MENU_HUMAN),
  ]
}

/**
 * The confirm/cancel pair for a reset.
 *
 * Cancel is `GET_STARTED` rather than a bespoke payload: that branch already
 * re-shows the menu prompt and chips, which is exactly the right place to land
 * someone who has just decided not to wipe their thread — and it costs no model
 * call. Note that `MENU_RESET_CONFIRM` appears here and NOWHERE else; that is
 * what makes the confirmation impossible to skip.
 */
export function resetConfirmQuickReplies(): QuickReply[] {
  return [
    quickReply("Yes, start over", MENU_RESET_CONFIRM),
    quickReply("No, keep my chat", GET_STARTED),
  ]
}

// --- Messenger Profile payload -------------------------------------------------

/**
 * The `POST /me/messenger_profile` body: Get Started, greeting and persistent
 * menu in one call.
 *
 * `composer_input_disabled: false` is load-bearing — leaving the composer
 * enabled is what keeps every flow typeable, which is the fallback the whole
 * design leans on when the model ignores a structured block.
 *
 * WHY "Visit our website" IS NO LONGER HERE. `PERSISTENT_MENU_MAX` is a hard
 * platform cap, not a style rule: a sixth item makes Meta reject the entire
 * profile update rather than dropping the extra, so "Start over" had to displace
 * something. The website link was the cheapest to lose because it is not lost —
 * `workAndPricingText` puts two deep links to the same site one tap away under
 * "Our work & pricing". Swap them back if the bare link matters more than an
 * always-reachable reset.
 *
 * Reset belongs at this level rather than only in the returning-visitor chips
 * because the visitor who most needs it is the one stuck mid-flow, and chips
 * vanish as soon as the next message arrives. The persistent menu never does.
 */
export function messengerProfilePayload() {
  return {
    get_started: { payload: GET_STARTED },
    greeting: [{ locale: "default", text: GREETING_TEXT }],
    persistent_menu: [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          { type: "postback", title: MENU_TITLES[MENU_ASSESSMENT], payload: MENU_ASSESSMENT },
          { type: "postback", title: MENU_TITLES[MENU_FAQ], payload: MENU_FAQ },
          { type: "postback", title: MENU_TITLES[MENU_WORK], payload: MENU_WORK },
          { type: "postback", title: MENU_TITLES[MENU_HUMAN], payload: MENU_HUMAN },
          { type: "postback", title: MENU_TITLES[MENU_RESET], payload: MENU_RESET },
        ],
      },
    ],
  }
}

/**
 * Sanity bound for the persistent menu. Meta allows 3 top-level items on some
 * surfaces and 5 here; exceeding it rejects the whole profile update rather than
 * dropping the extra, so the setup script asserts against this.
 */
export const PERSISTENT_MENU_MAX = 5

/**
 * Choice fields the assessment will walk, exposed for the setup script's
 * summary.
 *
 * Spelled out rather than derived from `Object.keys(CHOICE_FIELDS)`, which is
 * no longer the same set: property type, preferred solution and preferred
 * contact stay DEFINED so the marketing form's leads and `save_lead`'s enum
 * validation keep working, but the chat does not ask them. Deriving from the
 * keys would report three questions the visitor will never see.
 */
export const ASSESSMENT_FIELDS: (keyof typeof CHOICE_FIELDS)[] = [
  "monthlyBill",
  "usagePattern",
  "primaryGoal",
]
