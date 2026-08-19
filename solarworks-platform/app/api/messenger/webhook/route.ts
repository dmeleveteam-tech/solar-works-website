import { after, NextResponse } from "next/server"

import { LONG_WAIT_MS, MAX_MESSAGES, runChatTurn, type ChatMessage } from "@/lib/chat/brain"
import { siteFacts } from "@/lib/chat/site-facts"
import { CONSENT_ACCEPT_TEXT } from "@/lib/chat/vocab"
import { env, messengerEnabled } from "@/lib/env"
import { getLeadById, type Lead } from "@/lib/leads"
import {
  ALREADY_A_LEAD_TEXT,
  ASSESSMENT_QUESTIONS_TEXT,
  ASSESSMENT_UPDATE_PREFACE,
  FORM_HANDOFF_TEXT,
  GET_STARTED,
  GOOGLE_FORM_URL,
  HUMAN_HANDOFF_TEXT,
  MENU_ASSESSMENT,
  MENU_ASSESSMENT_UPDATE,
  MENU_FAQ,
  MENU_FORM,
  MENU_HUMAN,
  MENU_PROMPT,
  MENU_RESET,
  MENU_RESET_CONFIRM,
  MENU_WORK,
  RESET_CONFIRM_TEXT,
  RESET_DONE_TEXT,
  RESET_NOTHING_TEXT,
  assessmentQuickReplies,
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

/**
 * Labelled detail keys the assessment form writes (see the landing app's
 * `app/api/leads/route.ts`) that are worth echoing back in the greeting. Kept
 * to the three assessment questions, in the order the form asks them — the
 * point is a visitor recognizing what they just answered, not a full dump of
 * `details`, which also carries UTM attribution nobody needs to read back.
 */
const RECAP_DETAIL_KEYS = [
  "Monthly bill (PHP)",
  "Daytime vs nighttime usage",
  "Primary goal",
] as const

/**
 * The personalized `web_lead:<id>` greeting — printed instead of the generic
 * `WELCOME_MESSAGE` once the lead behind the id is found. Confirms we got the
 * right person (by name) and shows back exactly what they told the form, so
 * the hand-off reads as a continuation of the same conversation rather than a
 * cold "thanks, we got something."
 */
function buildWebLeadWelcome(lead: Lead): string {
  const details = lead.details ?? {}
  const lines = RECAP_DETAIL_KEYS.map((key) => details[key] && `• ${key}: ${details[key]}`).filter(
    Boolean,
  )
  const greeting = `Thanks for your inquiry, ${lead.name}! We've received your details from the website:`
  return lines.length
    ? `${greeting}\n${lines.join("\n")}\n\nOur team will reply to you here shortly. Feel free to ask us anything meanwhile.`
    : WELCOME_MESSAGE
}

const ATTACHMENT_REPLY =
  "Sorry — I can't read images or files here. Could you type your question instead?"

/**
 * Sent ONCE when a handed-off thread gets another message, then never again —
 * see `handoffNoticeSent` in lib/messenger/sessions.ts. The point of the hand-off
 * is that a colleague answering from the Page inbox is the only voice in here, so
 * repeating this on every message would recreate the problem it exists to solve.
 */
const HANDOFF_NOTICE = "Thanks! Someone from our team will reply here shortly."

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
 *
 * The Google Form is named here for the same reason it is offered under the
 * assessment questions: it is the one route to a lead that needs no model at
 * all, which is exactly what this copy is admitting we no longer have.
 */
const CHANNEL_FALLBACK = `Sorry — I can't answer properly right now. Our team is still available: call or Viber ${siteFacts.contact.whatsapp}, send your details through our form (${GOOGLE_FORM_URL}), or just type your name and number here and we'll get back to you.`

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
 * Send the four assessment questions as fixed copy and record them on the
 * transcript. Zero model calls — see the header of lib/messenger/menu.ts.
 *
 * The transcript write is not optional bookkeeping. The visitor's next message
 * is a blob of four answers with nothing around it, and the model only knows
 * what those answers are answering because the question it never asked is
 * sitting right above them in the history. Skip this and the model reads
 * "6-8k, night, zero bill, Rojan 0917…" as a fragment and starts asking the
 * questions again — the exact interrogation this replaced.
 *
 * `preface` is prepended in the SAME bubble rather than sent as its own message.
 * Two bubbles read as two people talking, which is the reasoning the model turn
 * further down already follows.
 */
async function askAssessment(
  psid: string,
  session: Awaited<ReturnType<typeof loadSession>>,
  preface?: string,
): Promise<void> {
  const text = preface ? `${preface}\n\n${ASSESSMENT_QUESTIONS_TEXT}` : ASSESSMENT_QUESTIONS_TEXT
  await sendQuickReplies(psid, text, assessmentQuickReplies())
  const turn: ChatMessage = { role: "assistant", content: text }
  session.messages = [...session.messages, turn].slice(-MAX_MESSAGES)
}

/**
 * Handle a `SW_MENU_*` postback.
 *
 * Mutates `session`; the caller owns persistence, so a menu tap and a model turn
 * cannot race each other writing the same document. `MENU_RESET_CONFIRM` is the
 * single documented exception — see the comment on that branch.
 *
 * EVERY branch answers from fixed copy and costs no model call, the assessment
 * included since the four questions became one scripted message. That is the
 * point: navigation should be instant, and the Groq free tier is a shared budget
 * with the web widget that an interrogation used to drain ten calls at a time.
 * `handled: false` now survives only for the unreachable default below.
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
      // And stop talking entirely. `leadAlreadySaved` only closes the lead write;
      // the model would happily keep answering, which is precisely what someone
      // who asked for a person did not ask for. `HUMAN_HANDOFF_TEXT` below is this
      // hand-off's notice, so mark it sent rather than following it with a second
      // near-identical line on their next message.
      session.humanHandoff = true
      session.handoffNoticeSent = true
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
      await sendQuickReplies(psid, "What would you like to know?", faqQuickReplies())
      return { handled: true }
    }

    case MENU_ASSESSMENT: {
      // Returning visitor: offer to update rather than silently starting a
      // second identical qualification and creating a duplicate lead.
      if (session.leadAlreadySaved) {
        await sendQuickReplies(psid, ALREADY_A_LEAD_TEXT, repeatLeadQuickReplies())
        return { handled: true }
      }
      // Asking for the assessment outright overrides an earlier "Prefer a form?":
      // they are choosing to answer here after all, and a brain still told to
      // skip the questions would ignore the answers they are about to give.
      session.chosePaperForm = false
      await askAssessment(psid, session)
      return { handled: true }
    }

    case MENU_FORM: {
      // They would rather fill in the Form than answer here. Record that, so the
      // brain is told not to re-run the assessment: the Form's Apps Script bridge
      // creates the lead on its own, and a second qualification in chat would put
      // this person in the sales inbox twice.
      //
      // Deliberately NOT `humanHandoff` — that silences the bot entirely, and
      // someone with a form open is precisely the person likely to ask a question
      // about it. They still get answers; they just don't get the questions.
      session.chosePaperForm = true
      await sendText(psid, FORM_HANDOFF_TEXT)
      const turn: ChatMessage = { role: "assistant", content: FORM_HANDOFF_TEXT }
      session.messages = [...session.messages, turn].slice(-MAX_MESSAGES)
      console.log(`[messenger] visitor chose the Google Form: psid=${psid}`)
      return { handled: true }
    }

    case MENU_ASSESSMENT_UPDATE: {
      // They explicitly asked to revise what we hold, so re-open saving. The
      // brain's own duplicate guard still applies within the turn; what this
      // reopens is a deliberate, user-initiated update.
      session.leadAlreadySaved = false
      // Same reasoning applies to the hand-off and to the Form: an explicit
      // "update my details" tap met with the hand-off's silence, or with a brain
      // told never to ask the assessment, is a dead button.
      session.humanHandoff = false
      session.handoffNoticeSent = false
      session.chosePaperForm = false
      // The SAME four questions, not a bespoke "is this still your number?"
      // read-back. Confirming what we hold sounds gentler but needs a model call
      // to compose, which is the cost this whole path exists to remove — and four
      // lines is less work for the visitor than correcting a summary. Their old
      // answers stay in the transcript, so `collectedFields` still shows the model
      // what we had if they only amend one of them.
      await askAssessment(psid, session, ASSESSMENT_UPDATE_PREFACE)
      return { handled: true }
    }

    case MENU_RESET: {
      // ASKS ONLY — never clears. This payload sits in the persistent menu, one
      // tap away at every moment including mid-qualification, so it must not be
      // able to destroy a transcript and a consent record on a single mis-tap.
      // MENU_RESET_CONFIRM below is the only thing that actually wipes.
      if (!hasResettableState(session)) {
        // Nothing to lose, so the confirmation would be pure friction: answer
        // the question they actually asked and start the assessment. One bubble,
        // because "nothing to clear yet" on its own answers a question nobody
        // asked and leaves them waiting for the real reply.
        await askAssessment(psid, session, RESET_NOTHING_TEXT)
        return { handled: true }
      }
      await sendQuickReplies(psid, RESET_CONFIRM_TEXT, resetConfirmQuickReplies())
      return { handled: true }
    }

    case MENU_RESET_CONFIRM: {
      resetSession(session)

      // The ONE place this function persists, breaking its own contract on
      // purpose. Every other branch can safely leave the write to the caller
      // because a failure there just loses a menu tap. Here the wipe is the
      // point, and the sends that follow can throw (Meta 5xx, a network blip) —
      // which would abandon the turn before the caller's save and leave the old
      // transcript, the old consent flag and the old `leadAlreadySaved` intact.
      // Saving now makes the reset real first; the caller's later save is then a
      // harmless second write, carrying the questions we appended below.
      await saveSession(session)
      console.log(`[messenger] session reset: psid=${psid}`)

      // Straight into a fresh assessment, in one bubble with the confirmation.
      // This used to hand `ASSESSMENT_RESTART_OPENER` to the model, whose only
      // job was to not hallucinate continuity with a transcript it could no
      // longer see. Fixed copy cannot hallucinate, and costs nothing.
      await askAssessment(psid, session, RESET_DONE_TEXT)
      return { handled: true }
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

  if (ref === "web_lead" || ref?.startsWith("web_lead:")) {
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

    // `web_lead:<id>` — the assessment form's redirect — carries the lead id so
    // we can greet by name and echo back what they answered. A bare `web_lead`
    // (older links, or the id failing to reach the browser) still gets the
    // generic line; a lookup failure degrades the same way rather than
    // blocking the greeting.
    let welcome = WELCOME_MESSAGE
    const leadId = ref.startsWith("web_lead:") ? ref.slice("web_lead:".length) : undefined
    if (leadId) {
      try {
        const lead = await getLeadById(leadId)
        if (lead) welcome = buildWebLeadWelcome(lead)
      } catch (err) {
        console.error("[messenger] failed to load web lead for greeting:", err)
      }
    }

    await sendText(psid, welcome)
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
  // lib/messenger/menu.ts for why these are not ordinary user turns. `handled`
  // ends the turn here, which every real branch now does; `brainText` remains
  // only so a payload added to MENU_PAYLOADS without a branch reaches the model
  // instead of going silent.
  let turnText = text
  if (isMenuPayload(text)) {
    const outcome = await handleMenu(text, psid, session)
    if (outcome.handled) {
      await saveSession(session)
      return
    }
    turnText = outcome.brainText
  }

  // HUMAN OWNS THIS THREAD — no model call, and after one notice, no reply at all.
  //
  // Set when a lead is captured and when the visitor asks for a person. A
  // colleague is now answering from the Page inbox, and a bot that keeps
  // answering alongside them is the whole complaint: the visitor sees two voices
  // and the thread stops reading as a conversation with the business.
  //
  // ORDER: deliberately AFTER the menu interception, not before it. The menu is
  // the visitor's only escape hatch — "Start over" (MENU_RESET /
  // MENU_RESET_CONFIRM) clears the hand-off via `resetSession`, and "Update my
  // details" clears it explicitly — and a short-circuit placed above the
  // interception would swallow those taps and strand the thread in hand-off
  // forever. It is still ahead of every `runChatTurn` call, which is the property
  // that matters; the rate limiter sits further up and is untouched, since a
  // handed-off flood should be throttled exactly like any other.
  //
  // `claimMid` has already run (well above), so a Meta retry of this delivery
  // cannot send the notice a second time.
  if (session.humanHandoff) {
    // The visitor's words still go on the transcript: a human scrolling this
    // thread has to see what was said while the bot was quiet, and the transcript
    // is the only place it lives.
    const handoffUserTurn: ChatMessage = { role: "user", content: turnText }
    session.messages = [...session.messages, handoffUserTurn].slice(-MAX_MESSAGES)

    if (!session.handoffNoticeSent) {
      session.handoffNoticeSent = true
      await sendText(psid, HANDOFF_NOTICE)
      const noticeTurn: ChatMessage = { role: "assistant", content: HANDOFF_NOTICE }
      session.messages = [...session.messages, noticeTurn].slice(-MAX_MESSAGES)
    }

    console.log(`[messenger] handed off, bot silent: psid=${psid}`)

    await saveSession(session)
    return
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
    chosePaperForm: session.chosePaperForm,
    channel: "messenger",
  })

  const ui = result.ui ? renderChatUi(result.ui) : null
  const degraded =
    result.fallback &&
    (result.fallback.kind !== "rate_limited" ||
      (result.fallback.retryAfterMs ?? 0) >= LONG_WAIT_MS)
  const reply = degraded ? CHANNEL_FALLBACK : result.message

  // EXACTLY ONE outbound bubble per turn.
  //
  // The prose and the block used to be sent as two separate messages, on the
  // theory that they said different things. In practice they do not: the model is
  // instructed to write a short line above the block, and the `question` it then
  // passes to `ask_choice`/`request_consent` is that same line again — so the
  // visitor was asked the same thing twice, back to back, and read it as two
  // people answering them. The chips have to ride on whichever message is last,
  // so the only way to keep them under the question is to send one message.
  //
  // The prose wins as that message's text, with `ui.text` as the fallback for the
  // turns where the model attaches a block and writes nothing above it.
  //
  // Tradeoff, deliberate: when the two genuinely differ — the model answers a
  // factual question in prose AND attaches a chip block with an unrelated
  // question — `ui.text` is dropped. That is accepted. The chips still spell out
  // the choice on their own labels, and one coherent message is better than a
  // thread that double-speaks on every single turn.
  const sentText = reply || ui?.text || ""
  if (sentText) {
    if (ui?.quickReplies?.length) await sendQuickReplies(psid, sentText, ui.quickReplies)
    else await sendText(psid, sentText)
  }

  // The transcript records what the visitor was actually sent — the one message
  // above, substitution and fallback included. Recording `reply` instead would
  // show the next turn's model a line the visitor never saw (or a promise of a
  // button we never offered), and it would re-answer from that fiction.
  // A turn that produced nothing to say records no assistant turn: an empty
  // assistant message in the history is a turn the model has to interpret, and it
  // reliably reads it as "I already answered that".
  session.messages = sentText
    ? [...messages, { role: "assistant", content: sentText } satisfies ChatMessage].slice(
        -MAX_MESSAGES,
      )
    : messages

  if (result.leadSaved) {
    session.leadAlreadySaved = true
    // The turn we just sent IS the confirmation, so the bot has said its last
    // word here. From the next message on a human owns the thread — see the
    // short-circuit above and the field docs in sessions.ts.
    session.humanHandoff = true
  }

  // Persisted last, and unconditionally: even a failed send should leave the
  // transcript advanced, or the next turn re-answers the same question.
  await saveSession(session)
}
