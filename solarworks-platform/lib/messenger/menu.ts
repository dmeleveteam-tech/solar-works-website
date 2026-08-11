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
 * exception: these actions are NAVIGATION, not answers to a question the model
 * asked. Feeding "Talk to a human" into the transcript as a user turn would have
 * the model treat it as conversational input and try to answer it, which is
 * exactly the wrong response to a request to stop talking to the bot.
 *
 * So menu payloads use a reserved `SW_MENU_*` namespace that `route.ts`
 * intercepts BEFORE the model call. The namespace prefix matters: a visitor who
 * literally types "SW_MENU_HUMAN" would otherwise trigger the branch, and more
 * realistically it keeps these strings from ever colliding with a canonical
 * option in `vocab.ts`.
 *
 * EVERY BRANCH IS NOW ANSWERED FROM FIXED COPY — no exceptions. Starting an
 * assessment used to resolve to a sentence that was fed to the brain, on the
 * theory that the model should own the flow it runs. In practice that made the
 * opener a model call, and each of the four questions another one: a complete
 * assessment cost ten or more calls and reliably exhausted the Groq free tier
 * mid-conversation, leaving a half-qualified visitor being told to try again in
 * 24 seconds. The questions are fixed text now (`ASSESSMENT_QUESTIONS_TEXT`),
 * asked all at once, and the model's job starts at the visitor's ANSWER. So a
 * menu tap costs zero calls, which is the whole point of the namespace.
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
 * "Prefer a form?" — the Google Form as an alternative to answering in chat.
 *
 * Offered alongside the assessment questions rather than in the persistent menu:
 * it only makes sense as an answer to "here are four questions", and the menu is
 * already at Meta's five-item cap (`PERSISTENT_MENU_MAX`).
 *
 * Tapping it is a fork in the road, not a detour — the Form's own Apps Script
 * bridge creates the lead, so the bot must stop qualifying (see `chosePaperForm`
 * in sessions.ts) or the same person arrives in the inbox twice.
 */
export const MENU_FORM = "SW_MENU_FORM"
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
  MENU_FORM,
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

// --- copy ---------------------------------------------------------------------

/**
 * THE ASSESSMENT. All four questions, in one message, sent as fixed text.
 *
 * This replaced an interrogation. The model used to ask these one at a time,
 * each question a full `runChatTurn` of up to two model calls, so a single
 * assessment burned ten or more calls and hit the free tier's rate limit
 * partway through — the visitor who had just typed their mobile number was
 * answered with "I need about 24 seconds to catch up", then "I lost my train of
 * thought". Asking everything at once costs nothing, cannot be rate-limited, and
 * cannot lose its place. The model is not involved until the visitor REPLIES,
 * and its job then is to read the answers out of that reply — see the
 * qualification section of the system prompt in lib/chat/brain.ts, which is
 * written against exactly this message.
 *
 * The numbering is load-bearing: it is what lets someone answer "1. 6-8k 2.
 * night 3. zero 4. Rojan 09..." and be understood. Keep the four items, keep
 * their order (it matches `REQUIRED_FIELD_LABELS`), and keep the closing line —
 * without it people still answer one question per message, which is the
 * behaviour this exists to end.
 *
 * The worked examples do the job `FORMAT_EXAMPLES` does elsewhere: there are no
 * labelled input boxes here, so the shape of the answer has to be shown.
 *
 * ENGLISH, like all fixed copy in this file — and load-bearing in a way the rest
 * is not. The brain mirrors the language of the visitor's most recent message,
 * and on a menu-started conversation the messages before it are ours. Seeding
 * Taglish here told the model "this visitor writes Taglish" before the visitor
 * had typed a word, which is how the whole channel ended up Taglish. The guard
 * test in menu.test.ts walks this string.
 */
export const ASSESSMENT_QUESTIONS_TEXT = `Our packages are personalized and right-sized for your requirements. Just a few quick questions so we can give you the best solution:

1. What's the range of your monthly electricity bill? (e.g. 6-8k per month)
2. Do you use electricity more during the day or at night? (e.g. 60% night, 40% day)
3. What's your electricity goal? Cut your bill by half, get it to near zero, or fix brownout problems?
4. Your name and mobile number, so we can give you a call.

You can answer all four in one message — no need to send them one by one.`

/**
 * Prefaces the questions when the visitor tapped "Update my details".
 *
 * A returning visitor gets the SAME four questions rather than a bespoke
 * "is this still your number?" flow. Confirming what we hold sounds gentler but
 * needs the model to read it back, which is the model call this whole change
 * exists to remove — and the answers are four lines to retype, not a form. The
 * preface is what stops it reading as though we forgot them.
 */
export const ASSESSMENT_UPDATE_PREFACE =
  "Happy to update your details — just send me the latest and I'll pass it on."

/**
 * The public Google Form, offered to anyone who would rather fill in a form than
 * answer in chat.
 *
 * DUPLICATED, and it has to be: the same URL is embedded by
 * `solarworks-landingpage/components/google-form-embed.tsx` and documented in
 * `google-form/README.md`, and those live in other apps this one does not
 * import from. A new Form means a new URL in ALL THREE — change one and the
 * others silently keep pointing at a form nobody reads. The handover checklist
 * in `Solar Works Vault/09-Handover` quotes it as well, for the same reason.
 */
export const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfiwCR-yK7djNaPJ7BbhfhXJlCyb399237QWWFFFJFpa1DV6w/viewform"

/**
 * Sent when the visitor taps "Prefer a form?". One line of explanation and the
 * link, and no model call.
 *
 * It promises we will not ask again, and `chosePaperForm` on the session is what
 * makes that true — the Form's Apps Script bridge creates the lead on its own,
 * so re-qualifying them here would put the same person in the inbox twice.
 */
export const FORM_HANDOFF_TEXT = `No problem — here's our assessment form instead:\n\n${GOOGLE_FORM_URL}\n\nSend it in whenever you're ready and our team will pick it up from there. I won't ask you those questions again — but do keep messaging here if anything comes up.`

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

/**
 * Sent when "Start over" is tapped on a thread with nothing to clear. Prefixes
 * `ASSESSMENT_QUESTIONS_TEXT` in the same bubble rather than standing alone —
 * on its own it is an answer to a question nobody asked.
 */
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

/**
 * The one chip under the assessment questions.
 *
 * Deliberately a single option. Everything else on this message is a question,
 * and a row of competing chips there reads as "or don't answer" — the escape
 * hatch is worth offering, the distraction is not. "Prefer a form?" is 14
 * characters, well inside Meta's 20-char title cap.
 */
export function assessmentQuickReplies(): QuickReply[] {
  return [quickReply("Prefer a form?", MENU_FORM)]
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
