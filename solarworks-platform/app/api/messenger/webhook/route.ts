import { after, NextResponse } from "next/server"

import { LONG_WAIT_MS, MAX_MESSAGES, runChatTurn, type ChatMessage } from "@/lib/chat/brain"
import { siteFacts } from "@/lib/chat/site-facts"
import { CONSENT_ACCEPT_TEXT } from "@/lib/chat/vocab"
import { env, messengerEnabled } from "@/lib/env"
import {
  ALREADY_A_LEAD_TEXT,
  ASSESSMENT_OPENER,
  ASSESSMENT_RESTART_OPENER,
  ASSESSMENT_UPDATE_OPENER,
  GET_STARTED,
  HUMAN_HANDOFF_TEXT,
  MENU_ASSESSMENT,
  MENU_ASSESSMENT_UPDATE,
  MENU_FAQ,
  MENU_HUMAN,
  MENU_PROMPT,
  MENU_RESET,
  MENU_RESET_CONFIRM,
  MENU_WORK,
  RESET_CONFIRM_TEXT,
  RESET_DONE_TEXT,
  RESET_NOTHING_TEXT,
  faqQuickReplies,
  isMenuPayload,
  menuQuickReplies,
  repeatLeadQuickReplies,
  resetConfirmQuickReplies,
  workAndPricingText,
} from "@/lib/messenger/menu"
import { renderChatUi } from "@/lib/messenger/render"
import { sendAction, sendQuickReplies, sendText } from "@/lib/messenger/send"
import {
  claimMid,
  hasResettableState,
  loadSession,
  resetSession,
  saveSession,
} from "@/lib/messenger/sessions"
import { verifySignature } from "@/lib/messenger/verify"
import { createRateLimiter } from "@/lib/rate-limit"

/**
 * Facebook Messenger webhook — the Solar Assistant's second channel.
 *
 * Supersedes `solarworks-landingpage/app/api/facebook/webhook/route.ts`, which
 * could only greet a `web_lead` referral and hand the thread to a human. This
 * one runs the same `runChatTurn` brain the web widget does, with per-PSID state
 * in `messenger_sessions` standing in for the browser-held transcript.
 *
 * Two things about Meta shape the whole handler:
 *
 *  1. It wants a response within ~20 seconds, and a turn can take 30 (two model
 *     calls, plus up to a 15s rate-limit wait on the Groq free tier). So we
 *     verify, answer 200 immediately, and do the work in `after()`.
 *  2. It retries aggressively on any non-200, and those retries arrive while the
 *     first attempt is still running. That is exactly how duplicate leads get
 *     created, so every path below returns 200 — including "not configured" and
 *     "bad payload" — and `claimMid` closes the race atomically before any model
 *     call happens.
 *
 * The one non-200 is the GET handshake, where a 403 is what Meta expects.
 */

export const runtime = "nodejs"
// Generous headroom over the ~30s worst-case turn. The webhook has already
// answered by then; this only bounds the `after()` work.
export const maxDuration = 60

/**
 * The web_lead hand-off greeting — see that branch below.
 *
 * Was preserved verbatim from the landing route in Tagalog; now English, with
 * the rest of this channel's fixed copy.
 */
const WELCOME_MESSAGE =
  "Thanks for your inquiry with Solar Works! We've received your details from the website. Feel free to ask us anything here — our team will reply to you on Messenger."

const ATTACHMENT_REPLY =
  "Sorry — I can't read images or files here. Could you type your question instead?"

const THROTTLED_REPLY =
  "One moment — those messages came in very quickly. Please try again in a few seconds."

/**
 * The brain's default degraded copy tells the visitor to tap "Assessment form
 * just below" — a widget button that does not exist in a Messenger thread, so
 * following it is impossible. That is exactly why `ChatTurnResult.fallback` is
 * exposed: substitute channel-appropriate copy when the turn came back
 * degraded, and leave the model's own words alone otherwise.
 *
 * `rate_limited` is substituted only on its LONG branch. The brain has two:
 * under `LONG_WAIT_MS` it just asks the visitor to re-send, which is already
 * channel-neutral and correct here because the transcript survives on the
 * session — but at or above it, the copy points at the "Assessment form" button
 * again. Treating the whole `rate_limited` kind as channel-neutral therefore
 * left the exhausted-daily-budget case pointing Messenger visitors at a button
 * they cannot see.
 */
const CHANNEL_FALLBACK = `Sorry — I can't answer properly right now. Our team is still available: call or Viber ${siteFacts.contact.whatsapp}, or just type your name, number and city here and we'll get back to you.`

/**
 * Per-PSID limiter. Generous enough that no real conversation touches it; it is
 * here so a stuck client or a scripted flood can't run up the model bill one
 * turn at a time. Per-process, like every other use in this codebase.
 */
const limiter = createRateLimiter({ limit: 12, windowMs: 60_000 })

// --- Meta's event shapes (only the fields we act on) -------------------------

type Referral = { ref?: string }

type MessagingEvent = {
  sender?: { id?: string }
  optin?: Referral
  referral?: Referral
  postback?: { payload?: string; referral?: Referral }
  message?: {
    mid?: string
    text?: string
    is_echo?: boolean
    referral?: Referral
    quick_reply?: { payload?: string }
    attachments?: { type?: string }[]
  }
}

type WebhookBody = { entry?: { messaging?: MessagingEvent[] }[] }

// --- GET: Meta's subscription handshake --------------------------------------

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // Deny by default: an unconfigured bot must not complete a subscription.
  if (!messengerEnabled) {
    return NextResponse.json({ error: "Messenger is not configured." }, { status: 403 })
  }

  if (mode === "subscribe" && token && token === env.FB_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 })
  }
  return NextResponse.json({ error: "Verification failed." }, { status: 403 })
}

// --- POST: event delivery ----------------------------------------------------

/** Always this — see the header comment on why nothing here ever 4xx/5xxs. */
const ACK = () => NextResponse.json({ received: true })

export async function POST(req: Request) {
  // The raw body, not `req.json()`: the signature is an HMAC over the exact
  // bytes Meta sent, and re-serializing a parsed object produces a different
  // string (key order, escaping) that will never verify. Parse afterwards.
  const raw = await req.text()

  if (!messengerEnabled) {
    console.warn("[messenger] delivery ignored: bot is not configured")
    return ACK()
  }

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), env.FB_APP_SECRET)) {
    // Unsigned or forged. Still 200 — a 403 here just makes Meta retry the same
    // bad delivery for hours; we simply do nothing with it.
    console.warn("[messenger] delivery rejected: bad X-Hub-Signature-256")
    return ACK()
  }

  let body: WebhookBody
  try {
    body = JSON.parse(raw) as WebhookBody
  } catch {
    console.warn("[messenger] delivery ignored: body was not JSON")
    return ACK()
  }

  const events = (body.entry ?? []).flatMap((entry) => entry.messaging ?? [])
  if (events.length) after(() => processEvents(events))

  return ACK()
}

// --- event processing (runs after the 200) -----------------------------------

async function processEvents(events: MessagingEvent[]): Promise<void> {
  for (const event of events) {
    try {
      await processEvent(event)
    } catch (err) {
      // One malformed event must not abandon the rest of the batch, and nothing
      // may reject out of `after()`.
      console.error("[messenger] event processing failed:", err)
    }
  }
}

/** The `ref` we were opened with, wherever Meta chose to put it this time. */
function referralRef(event: MessagingEvent): string | undefined {
  return (
    event.optin?.ref ??
    event.referral?.ref ??
    event.message?.referral?.ref ??
    event.postback?.referral?.ref
  )
}

/**
 * The visitor's text for this turn.
 *
 * A quick-reply `payload` WINS over `message.text`. The title the visitor tapped
 * is short display text ("Business costs"); the payload is the canonical
 * labelled string ("Primary goal: Business operating cost") that the brain's
 * `collectedFields` scanner and its verbatim consent match both depend on. Feed
 * the title in and the field reads as unanswered forever.
 */
function visitorText(event: MessagingEvent): string | undefined {
  const payload = event.message?.quick_reply?.payload ?? event.postback?.payload
  const text = payload ?? event.message?.text
  return text?.trim() || undefined
}

/**
 * Outcome of a menu tap: either the turn is finished here, or it continues into
 * the brain carrying `brainText` in place of the raw payload.
 */
type MenuOutcome = { handled: true } | { handled: false; brainText: string }

/**
 * Handle a `SW_MENU_*` postback.
 *
 * Mutates `session`; the caller owns persistence, so a menu tap and a model turn
 * cannot race each other writing the same document. `MENU_RESET_CONFIRM` is the
 * single documented exception — see the comment on that branch.
 *
 * Most branches answer directly and cost no model call at all, which is the
 * point: navigation should be instant, and the Groq free tier is a shared budget
 * with the web widget.
 */
async function handleMenu(
  payload: string,
  psid: string,
  session: Awaited<ReturnType<typeof loadSession>>,
): Promise<MenuOutcome> {
  switch (payload) {
    case GET_STARTED: {
      await sendQuickReplies(psid, MENU_PROMPT, menuQuickReplies())
      return { handled: true }
    }

    case MENU_HUMAN: {
      // Stop qualifying. The flag is what the brain reads to decide it must not
      // save another lead, and it is exactly right here: a visitor asking for a
      // person should not be walked through a form by a robot.
      session.leadAlreadySaved = true
      await sendText(psid, HUMAN_HANDOFF_TEXT)
      console.log(`[messenger] human hand-off requested: psid=${psid}`)
      return { handled: true }
    }

    case MENU_WORK: {
      await sendQuickReplies(
        psid,
        workAndPricingText(env.MARKETING_SITE_URL),
        menuQuickReplies(),
      )
      return { handled: true }
    }

    case MENU_FAQ: {
      await sendQuickReplies(psid, "Ano po ang gusto ninyong malaman?", faqQuickReplies())
      return { handled: true }
    }

    case MENU_ASSESSMENT: {
      // Returning visitor: offer to update rather than silently starting a
      // second identical qualification and creating a duplicate lead.
      if (session.leadAlreadySaved) {
        await sendQuickReplies(psid, ALREADY_A_LEAD_TEXT, repeatLeadQuickReplies())
        return { handled: true }
      }
      return { handled: false, brainText: ASSESSMENT_OPENER }
    }

    case MENU_ASSESSMENT_UPDATE: {
      // They explicitly asked to revise what we hold, so re-open saving. The
      // brain's own duplicate guard still applies within the turn; what this
      // reopens is a deliberate, user-initiated update.
      session.leadAlreadySaved = false
      return { handled: false, brainText: ASSESSMENT_UPDATE_OPENER }
    }

    case MENU_RESET: {
      // ASKS ONLY — never clears. This payload sits in the persistent menu, one
      // tap away at every moment including mid-qualification, so it must not be
      // able to destroy a transcript and a consent record on a single mis-tap.
      // MENU_RESET_CONFIRM below is the only thing that actually wipes.
      if (!hasResettableState(session)) {
        // Nothing to lose, so the confirmation would be pure friction: answer
        // the question they actually asked and start the assessment.
        await sendText(psid, RESET_NOTHING_TEXT)
        return { handled: false, brainText: ASSESSMENT_OPENER }
      }
      await sendQuickReplies(psid, RESET_CONFIRM_TEXT, resetConfirmQuickReplies())
      return { handled: true }
    }

    case MENU_RESET_CONFIRM: {
      resetSession(session)

      // The ONE place this function persists, breaking its own contract on
      // purpose. Every other branch can safely leave the write to the caller
      // because a failure there just loses a menu tap. Here the visitor has
      // already been told their thread is cleared, and the model call that
      // follows can throw (provider error, rate limit) — which would abandon the
      // turn before the caller's save and leave the old transcript, the old
      // consent flag and the old `leadAlreadySaved` intact behind a message
      // promising otherwise. Saving now makes the promise true first; the
      // caller's later save is then a harmless second write of the same state.
      await saveSession(session)
      console.log(`[messenger] session reset: psid=${psid}`)

      await sendText(psid, RESET_DONE_TEXT)
      return { handled: false, brainText: ASSESSMENT_RESTART_OPENER }
    }

    default:
      // `isMenuPayload` already narrowed this, so reaching here means a payload
      // was added to MENU_PAYLOADS without a branch. Fall through to the model
      // rather than going silent.
      console.warn(`[messenger] unhandled menu payload: ${payload}`)
      return { handled: false, brainText: payload }
  }
}

async function processEvent(event: MessagingEvent): Promise<void> {
  const psid = event.sender?.id
  if (!psid) return

  // Echoes are our own outbound messages coming back. Processing one makes the
  // bot answer itself, forever.
  if (event.message?.is_echo) return

  const ref = referralRef(event)

  if (ref === "web_lead") {
    // PRESERVED BEHAVIOUR. This referral comes from the "Continue on Messenger"
    // link shown after the website chatbot or form already saved a lead — the
    // visitor is being handed to a human, not to the bot. Greeting them and
    // stopping is the whole point; starting a qualification flow here would
    // re-ask everything they just told us and risk a duplicate lead.
    console.log(`[messenger] web lead opened Messenger: psid=${psid}`)
    const session = await loadSession(psid)
    session.leadAlreadySaved = true
    session.attribution = { ...session.attribution, utm_source: "messenger", utm_campaign: ref }
    await saveSession(session)
    await sendText(psid, WELCOME_MESSAGE)
    return
  }

  const text = visitorText(event)
  const mid = event.message?.mid

  // Non-text content. The model can't see it and describing it costs a call, so
  // answer directly. Deliberately before the mid claim is *not* possible — a
  // retry would re-send this — so it sits after.
  if (!text) {
    if (event.message?.attachments?.length) {
      if (mid && !(await claimMid(psid, mid))) return
      await sendText(psid, ATTACHMENT_REPLY)
    }
    return
  }

  // Idempotency FIRST, before the rate limit and before any model call: this is
  // the guard that stops a Meta retry becoming a second lead.
  if (mid && !(await claimMid(psid, mid))) return

  if (!limiter.check(psid).ok) {
    console.warn(`[messenger] rate limited: psid=${psid}`)
    await sendText(psid, THROTTLED_REPLY)
    return
  }

  const session = await loadSession(psid)

  // A ref other than web_lead is campaign attribution — it rides onto the lead
  // when the brain eventually saves one.
  if (ref) {
    session.attribution = { ...session.attribution, utm_source: "messenger", utm_campaign: ref }
  } else if (!session.attribution.utm_source) {
    session.attribution = { ...session.attribution, utm_source: "messenger" }
  }

  // Menu navigation is intercepted BEFORE the model call — see the header of
  // lib/messenger/menu.ts for why these four are not ordinary user turns.
  // `handled` ends the turn here; `brainText` substitutes the canonical opener
  // and falls through to the normal path.
  let turnText = text
  if (isMenuPayload(text)) {
    const outcome = await handleMenu(text, psid, session)
    if (outcome.handled) {
      await saveSession(session)
      return
    }
    turnText = outcome.brainText
  }

  // The consent tap IS the consent record — PSID, timestamp and the exact
  // wording accepted. A stronger Data Privacy Act trail than the web widget's
  // client-supplied boolean, which its own comment notes is not tamper-proof.
  if (text === CONSENT_ACCEPT_TEXT && !session.consentConfirmed) {
    session.consentConfirmed = true
    session.consentAt = new Date()
    session.consentText = CONSENT_ACCEPT_TEXT
  }

  // Fire and forget: the visitor should see these immediately, and neither is
  // worth delaying the turn for.
  void sendAction(psid, "mark_seen")
  void sendAction(psid, "typing_on")

  const userTurn: ChatMessage = { role: "user", content: turnText }
  const messages = [...session.messages, userTurn].slice(-MAX_MESSAGES)

  const result = await runChatTurn({
    messages,
    attribution: session.attribution,
    consentConfirmed: session.consentConfirmed,
    leadAlreadySaved: session.leadAlreadySaved,
    channel: "messenger",
  })

  const ui = result.ui ? renderChatUi(result.ui) : null
  const degraded =
    result.fallback &&
    (result.fallback.kind !== "rate_limited" ||
      (result.fallback.retryAfterMs ?? 0) >= LONG_WAIT_MS)
  const reply = degraded ? CHANNEL_FALLBACK : result.message

  // The prose first, then the block. When there is a block its own text carries
  // the question, so folding the two into one message would repeat it.
  if (reply) await sendText(psid, reply)
  if (ui) {
    if (ui.quickReplies?.length) await sendQuickReplies(psid, ui.text, ui.quickReplies)
    else await sendText(psid, ui.text)
  }

  // The transcript records what the visitor was actually sent, substitution and
  // all — otherwise the next turn's model sees a promise of a button we never
  // offered.
  const botTurn: ChatMessage = { role: "assistant", content: reply }
  session.messages = [...messages, botTurn].slice(-MAX_MESSAGES)
  if (result.leadSaved) session.leadAlreadySaved = true

  // Persisted last, and unconditionally: even a failed send should leave the
  // transcript advanced, or the next turn re-answers the same question.
  await saveSession(session)
}
