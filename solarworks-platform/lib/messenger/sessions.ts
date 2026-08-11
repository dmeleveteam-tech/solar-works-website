import "server-only"
import type { Collection } from "mongodb"

import { MAX_MESSAGES, type ChatMessage } from "../chat/brain"
import { db } from "../mongodb"

/**
 * Per-visitor conversation state for the Messenger channel.
 *
 * The web widget holds the transcript in the browser and posts the whole thing
 * on every turn, so `/api/chat` is stateless. Messenger gives us one message and
 * a PSID and nothing else — so the transcript, the consent record and the
 * "already saved" flag have to live server-side, keyed by PSID. This collection
 * is what lets `collectedFields`, `mustSaveLead` and the forced-save-on-consent
 * logic in the brain work on this channel with no changes at all.
 *
 * `_id` is the PSID itself rather than an ObjectId: it is already a unique,
 * stable, page-scoped identifier, and making it the primary key is what gives
 * `claimMid` its atomicity (see below).
 */

export type MessengerSession = {
  _id: string
  /** Capped at MAX_MESSAGES, most recent kept — same budget as the web widget. */
  messages: ChatMessage[]
  consentConfirmed: boolean
  consentAt: Date | null
  /**
   * The exact wording the visitor accepted. The web widget sends a boolean the
   * client controls, which its own comment admits is not tamper-proof; here the
   * quick-reply tap IS the record, so we keep PSID + timestamp + verbatim text
   * as the Data Privacy Act audit trail.
   */
  consentText: string | null
  leadAlreadySaved: boolean
  /**
   * The bot has stepped aside and a human owns this thread.
   *
   * Set once a lead is captured, and when the visitor asks for a person from the
   * menu. `leadAlreadySaved` alone is not enough: it only stops the brain writing
   * a SECOND lead, the model still keeps talking — so a colleague replying from
   * the Page inbox ends up in a two-voice conversation with the visitor, and the
   * thread reads as "the bot answered over you". While this is true the webhook
   * makes no model call at all.
   *
   * Cleared by `resetSession`, because a visitor who explicitly starts over is
   * asking for the bot back.
   */
  humanHandoff: boolean
  /**
   * Whether the one-time "someone will reply here shortly" notice has gone out
   * for the current hand-off. Without it every later message would get the same
   * line again, which is exactly the robot-talking-over-a-human noise the
   * hand-off exists to remove — after the notice the bot is simply silent.
   */
  handoffNoticeSent: boolean
  attribution: Record<string, string>
  /** Message ids already processed, most recent first. Idempotency, see claimMid. */
  seenMids: string[]
  createdAt: Date
  updatedAt: Date
}

/** How many message ids to remember. Meta retries within minutes, not days. */
const SEEN_MID_CAP = 50

/** How long an idle thread is kept before Mongo's TTL monitor removes it. */
const RETENTION_DAYS = 30

export function messengerSessionsCollection(): Collection<MessengerSession> {
  return db.collection<MessengerSession>("messenger_sessions")
}

/**
 * Create the collection's indexes once per process. `createIndexes` is
 * idempotent, so this is safe to call on every webhook delivery; the memo just
 * avoids the round-trip. A failure is logged and retried on the next call rather
 * than breaking the turn — same reasoning as `ensureIndexes` in
 * lib/notifications.ts.
 *
 * Only the TTL index is needed: every other access is by `_id`, which Mongo
 * indexes for us.
 */
let indexesReady: Promise<unknown> | null = null

export function ensureMessengerIndexes(): Promise<unknown> {
  indexesReady ??= messengerSessionsCollection()
    .createIndexes([
      // TTL: an abandoned thread's transcript is personal data we have no reason
      // to keep. 30 days of inactivity and it goes.
      { key: { updatedAt: 1 }, expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 },
    ])
    .catch((err) => {
      console.error("Messenger session index creation failed:", err)
      indexesReady = null
    })
  return indexesReady
}

/** A brand-new, unsaved session for a PSID we have not seen before. */
function emptySession(psid: string): MessengerSession {
  const now = new Date()
  return {
    _id: psid,
    messages: [],
    consentConfirmed: false,
    consentAt: null,
    consentText: null,
    leadAlreadySaved: false,
    humanHandoff: false,
    handoffNoticeSent: false,
    attribution: {},
    seenMids: [],
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * The stored session for a PSID, or a fresh in-memory default.
 *
 * Deliberately does NOT write on a miss: a webhook delivery we end up ignoring
 * (an echo, a sticker, a rate-limited flood) must not create a document, or the
 * collection fills with empty sessions that the TTL index then has to clear.
 */
export async function loadSession(psid: string): Promise<MessengerSession> {
  await ensureMessengerIndexes()
  try {
    const doc = await messengerSessionsCollection().findOne({ _id: psid })
    return doc ?? emptySession(psid)
  } catch (err) {
    // Degrade to a fresh session rather than dropping the turn. The visitor gets
    // a bot with no memory, which is bad; silence is worse.
    console.error("[messenger] session load failed:", err)
    return emptySession(psid)
  }
}

/**
 * Clear a session back to a fresh conversation, IN PLACE. The caller persists.
 *
 * This is what the "Start over" menu action runs, and it is deliberately not
 * `deleteSession`. Two fields have to survive a reset:
 *
 *  - `seenMids`, because it is the idempotency ledger. Dropping it would let a
 *    Meta retry of any delivery still in flight be processed a second time —
 *    re-opening the duplicate-lead race `claimMid` exists to close, at the one
 *    moment the visitor is about to be re-qualified. (`saveSession` never writes
 *    `seenMids`, so simply not touching it here is enough.)
 *  - `attribution`, because it records how this person found us, which starting
 *    a new assessment does not change. Losing it would silently re-attribute a
 *    campaign lead to plain organic Messenger traffic.
 *
 * Everything else goes, consent included: a cleared thread must re-consent
 * before another lead can be written, or we would be saving against a record the
 * visitor can no longer see.
 */
export function resetSession(session: MessengerSession): MessengerSession {
  session.messages = []
  session.consentConfirmed = false
  session.consentAt = null
  session.consentText = null
  session.leadAlreadySaved = false
  // The bot comes back. "Start over" is the visitor asking to be talked to by the
  // assistant again, and leaving the hand-off set would give them a cleared
  // thread that then answers nothing — indistinguishable from a broken bot.
  session.humanHandoff = false
  session.handoffNoticeSent = false
  return session
}

/**
 * True when a reset would actually discard something worth confirming first.
 *
 * A hand-off counts on its own: a thread a human has taken over holds no
 * transcript-shaped state of its own, but clearing it silently changes who the
 * visitor is talking to, which is exactly the kind of surprise the confirmation
 * step exists to prevent.
 */
export function hasResettableState(session: MessengerSession): boolean {
  return (
    session.messages.length > 0 ||
    session.consentConfirmed ||
    session.leadAlreadySaved ||
    session.humanHandoff
  )
}

/**
 * Erase everything we hold for one PSID — the conversation, the consent record,
 * the attribution and the claimed message ids — by dropping the document.
 *
 * This backs Meta's Data Deletion Request callback, which is mandatory for any
 * app that stores user data (we store transcripts, so it applies to us). It
 * deliberately does NOT touch leads: a lead was captured under its own explicit
 * consent and is a legitimate business record, and Meta's requirement covers
 * data obtained through the app.
 *
 * Returns whether a document actually existed. A request for a PSID we hold
 * nothing for is a SUCCESS, not an error — there is genuinely nothing left.
 * Unlike the rest of this module it lets errors propagate: the caller must not
 * report a deletion it cannot confirm.
 */
export async function deleteSession(psid: string): Promise<boolean> {
  const result = await messengerSessionsCollection().deleteOne({ _id: psid })
  return result.deletedCount > 0
}

/**
 * Persist a session, upserting on the PSID.
 *
 * `seenMids` is deliberately NOT written here. It is owned exclusively by
 * `claimMid`, and a save that carried a stale copy from the start of a 30-second
 * turn would erase ids claimed concurrently — reopening the exact duplicate-lead
 * race `claimMid` exists to close.
 */
export async function saveSession(session: MessengerSession): Promise<void> {
  try {
    await messengerSessionsCollection().updateOne(
      { _id: session._id },
      {
        $set: {
          messages: session.messages.slice(-MAX_MESSAGES),
          consentConfirmed: session.consentConfirmed,
          consentAt: session.consentAt,
          consentText: session.consentText,
          leadAlreadySaved: session.leadAlreadySaved,
          humanHandoff: session.humanHandoff,
          handoffNoticeSent: session.handoffNoticeSent,
          attribution: session.attribution,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: session.createdAt ?? new Date(), seenMids: [] },
      },
      { upsert: true },
    )
  } catch (err) {
    // Never throw out of a webhook turn: the reply has usually already been
    // sent, and a rejection inside `after()` has nowhere to go.
    console.error("[messenger] session save failed:", err)
  }
}

/**
 * Record a message id as processed. Returns false if it was already seen.
 *
 * This MUST stay a single atomic `findOneAndUpdate`, never a read-then-write.
 * Meta retries a delivery when it doesn't get a 200 fast enough, and those
 * retries routinely arrive while the first attempt is still running — two
 * concurrent invocations, same `mid`. A read-then-write lets both read "not
 * seen", both run the model, and both save the lead. The `$nin` guard in the
 * FILTER is what makes the check and the claim one operation.
 *
 * The `upsert` is what handles a first-ever message: the filter can't match a
 * document that doesn't exist yet. When the document DOES exist and already
 * holds the mid, the filter misses, Mongo attempts an insert instead, and the
 * `_id` unique index rejects it with duplicate-key 11000 — which is precisely
 * the "already seen" signal we want, delivered atomically by the server.
 *
 * Fails CLOSED on an unexpected error (returns false, i.e. "skip this event").
 * A dropped message is a visitor repeating themselves; a duplicate is a
 * duplicate lead in the sales inbox.
 */
export async function claimMid(psid: string, mid: string): Promise<boolean> {
  if (!mid) return false

  try {
    await messengerSessionsCollection().updateOne(
      { _id: psid, seenMids: { $nin: [mid] } },
      {
        $push: { seenMids: { $each: [mid], $position: 0, $slice: SEEN_MID_CAP } },
        $set: { updatedAt: new Date() },
        $setOnInsert: {
          messages: [],
          consentConfirmed: false,
          consentAt: null,
          consentText: null,
          leadAlreadySaved: false,
          humanHandoff: false,
          handoffNoticeSent: false,
          attribution: {},
          createdAt: new Date(),
        },
      },
      { upsert: true },
    )
    return true
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      // Already claimed — a retry of a delivery we are handling or have handled.
      console.log(`[messenger] duplicate delivery ignored: psid=${psid} mid=${mid}`)
      return false
    }
    console.error("[messenger] mid claim failed:", err)
    return false
  }
}
