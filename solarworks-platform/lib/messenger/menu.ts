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
/** Meta's own reserved payload for the Get Started button. */
export const GET_STARTED = "SW_GET_STARTED"

export const MENU_PAYLOADS = [
  MENU_ASSESSMENT,
  MENU_ASSESSMENT_UPDATE,
  MENU_FAQ,
  MENU_HUMAN,
  MENU_WORK,
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
 * the model reads it as an ordinary opening turn. Taglish deliberately: it
 * matches how the assistant is prompted to reply and how visitors actually
 * write.
 */
export const ASSESSMENT_OPENER =
  "Gusto ko pong mag-start ng solar assessment para sa property ko."

/**
 * Re-engagement opener for someone we already hold a lead for.
 *
 * It names the situation explicitly so the model confirms what we have instead
 * of re-interrogating from scratch — the difference between "welcome back, is
 * this still the right number?" and a second identical lead in the sales inbox.
 */
export const ASSESSMENT_UPDATE_OPENER =
  "Nag-inquire na po ako dati. Gusto ko lang pong i-update ang mga detalye ko."

// --- copy ---------------------------------------------------------------------

export const MENU_TITLES = {
  [MENU_ASSESSMENT]: "Start assessment",
  [MENU_FAQ]: "Ask a question",
  [MENU_HUMAN]: "Talk to a human",
  [MENU_WORK]: "Our work & pricing",
} as const

export const GREETING_TEXT =
  "Kumusta! Ako ang Solar Assistant ng Solar Works ☀️ Matutulungan ko kayong malaman kung magkano ang matitipid ninyo sa solar. Pindutin lang ang Get Started para magsimula."

export const MENU_PROMPT =
  "Ano po ang maitutulong ko sa inyo ngayon?"

export const HUMAN_HANDOFF_TEXT = `Sige po, ipaparating ko na sa team namin. Pwede rin ninyo kaming direktang kontakin:\n\n📞 Tawag / Viber: ${siteFacts.contact.phone}\n✉️ Email: ${siteFacts.contact.email}\n\nMag-reply lang po kayo dito kung may gusto pa kayong itanong — babalikan kayo ng team namin sa oras ng negosyo.`

export const ALREADY_A_LEAD_TEXT =
  "Salamat po — nakuha na namin ang mga detalye ninyo dati. Gusto ba ninyong i-update ang mga ito, o may itatanong pa kayo?"

/**
 * Answers a link, not prose: the site already says this better than the bot can,
 * and a Messenger thread is a bad place to paste a project portfolio.
 */
export function workAndPricingText(siteUrl: string): string {
  const areas = siteFacts.serviceAreas.join(", ")
  return `Narito po ang ilan sa mga naitayo naming sistema at ang gabay sa presyo:\n\n🔧 Mga proyekto: ${siteUrl}/our-work\n💡 Mga solusyon at presyo: ${siteUrl}/solar-solutions\n\nSakop po namin ang ${areas}. May kasama pong ${siteFacts.warranties.panel} at ${siteFacts.warranties.support}.`
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
  { title: "Magkano ang solar?", question: "Magkano po ang solar system para sa isang bahay?" },
  { title: "Ilang tipid?", question: "Magkano po ang matitipid ko sa kuryente kada buwan?" },
  { title: "Gaano katagal?", question: "Gaano po katagal ang installation ng solar?" },
  { title: "May warranty?", question: "Ano po ang warranty ng mga panel at battery ninyo?" },
  { title: "May financing?", question: "May financing o installment option po ba kayo?" },
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

/** The returning-visitor fork: update what we hold, or just ask something. */
export function repeatLeadQuickReplies(): QuickReply[] {
  return [
    quickReply("Update my details", MENU_ASSESSMENT_UPDATE),
    quickReply(MENU_TITLES[MENU_FAQ], MENU_FAQ),
    quickReply(MENU_TITLES[MENU_HUMAN], MENU_HUMAN),
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
 */
export function messengerProfilePayload(siteUrl: string) {
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
          { type: "web_url", title: "Visit our website", url: siteUrl, webview_height_ratio: "full" },
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

/** Choice fields the assessment will walk, exposed for the setup script's summary. */
export const ASSESSMENT_FIELDS = Object.keys(CHOICE_FIELDS)
