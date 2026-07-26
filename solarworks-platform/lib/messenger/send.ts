import "server-only"

import { env } from "../env"
import type { QuickReply } from "./render"

/**
 * Facebook Send API wrapper (Graph v21.0).
 *
 * Supersedes `solarworks-landingpage/lib/facebook.ts`, which sent every message
 * with `messaging_type: "MESSAGE_TAG"` and `tag: "CONFIRMED_EVENT_UPDATE"`.
 * That combination is for messaging a user OUTSIDE the 24-hour standard
 * messaging window — a booked-appointment reminder, say. Using it for an
 * ordinary reply to a message the user just sent misrepresents the send to Meta
 * and is a policy-violation risk that can cost the Page its messaging
 * permission. Every reply this bot makes is inside the window by definition
 * (the user messaged us; that is why we are running), so the correct value is
 * `messaging_type: "RESPONSE"`. Do not reinstate the tag: if a genuine
 * outside-window notification is ever needed it belongs in its own function
 * with its own tag, not smuggled onto the reply path.
 *
 * Everything here fails soft. A send that fails must never take down the turn
 * that produced it — the session is already persisted and a dropped message is
 * recoverable by the visitor typing again, whereas a thrown error inside
 * `after()` is an unhandled rejection with no user-visible recovery at all.
 */

const GRAPH_URL = "https://graph.facebook.com/v21.0/me/messages"

/** Meta rejects a message body over this; it does not truncate for us. */
const TEXT_MAX = 2000

export type SenderAction = "mark_seen" | "typing_on"

/**
 * Split a reply into Messenger-sized chunks, preferring a sentence boundary.
 *
 * The model is told to keep replies short but occasionally returns a long
 * grounded answer from the KB. Cutting at exactly 2000 characters lands
 * mid-word and reads like a truncation bug, so we walk back to the last
 * sentence end, then to the last whitespace, and only hard-cut if neither
 * exists (a 2000-character URL, effectively).
 */
export function splitForMessenger(text: string, limit = TEXT_MAX): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= limit) return [trimmed]

  const chunks: string[] = []
  let rest = trimmed

  while (rest.length > limit) {
    const window = rest.slice(0, limit)
    const sentenceEnd = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf("\n"),
    )
    const cut =
      sentenceEnd > limit * 0.5
        ? sentenceEnd + 1
        : window.lastIndexOf(" ") > 0
          ? window.lastIndexOf(" ")
          : limit

    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }

  if (rest) chunks.push(rest)
  return chunks
}

/** POST one payload to the Send API. Never throws; returns whether it landed. */
async function post(payload: Record<string, unknown>): Promise<boolean> {
  const token = env.FB_PAGE_ACCESS_TOKEN
  if (!token) {
    console.error("[messenger] send skipped: FB_PAGE_ACCESS_TOKEN is not configured")
    return false
  }

  try {
    const res = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error(`[messenger] send failed ${res.status}: ${detail}`)
      return false
    }
    return true
  } catch (err) {
    console.error("[messenger] send error:", err)
    return false
  }
}

/** Send a plain text reply, split across messages if it exceeds the cap. */
export async function sendText(psid: string, text: string): Promise<boolean> {
  const chunks = splitForMessenger(text)
  if (!chunks.length) return false

  let ok = true
  for (const chunk of chunks) {
    // Sequential, not Promise.all: Messenger delivers in the order it receives
    // and a parallel burst can arrive shuffled, which turns a two-part answer
    // into nonsense.
    ok = (await post({
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text: chunk },
    })) && ok
  }
  return ok
}

/**
 * Send text with quick replies attached.
 *
 * When the text has to be split, the chips ride on the LAST chunk — they must
 * sit under the question they answer, and Meta only shows the most recent
 * message's quick replies anyway.
 */
export async function sendQuickReplies(
  psid: string,
  text: string,
  replies: QuickReply[],
): Promise<boolean> {
  if (!replies.length) return sendText(psid, text)

  const chunks = splitForMessenger(text)
  const last = chunks.pop() ?? ""

  let ok = true
  for (const chunk of chunks) {
    ok = (await post({
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text: chunk },
    })) && ok
  }

  return (await post({
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: { text: last || "…", quick_replies: replies },
  })) && ok
}

/**
 * Typing indicator / read receipt. Sent before the model call, which can take
 * many seconds — without it the thread looks dead and the visitor sends the
 * same question again.
 *
 * A sender action carries no `messaging_type`; including one is an error.
 */
export async function sendAction(psid: string, action: SenderAction): Promise<boolean> {
  return post({ recipient: { id: psid }, sender_action: action })
}
