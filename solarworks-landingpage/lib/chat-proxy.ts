/**
 * Server-side hop to the chat brain, which lives in the platform app
 * (`lib/chat/brain.ts`, exposed as `POST /api/chat`). Only this module knows the
 * platform's chat URL and shared key — mirroring `lib/leads.ts` and
 * `lib/kb-search.ts`, it keeps them out of the browser and in one place.
 *
 * The brain moved to the platform because that is where the knowledge base and
 * the leads inbox already are, and because Messenger needs the persistent state
 * only the platform's database can hold. The landing app keeps the public edge:
 * input validation and the visitor-facing fallback copy.
 *
 * Every failure (not configured, network error, non-OK response) comes back as
 * `null`, so the caller can answer with its own hand-off wording instead of
 * showing the visitor an error. This file must only be imported from server code
 * (route handlers).
 */

/** Turn sent to the platform. Mirrors its `ChatTurnInput` minus `channel`. */
export type ChatTurnPayload = {
  messages: { role: "user" | "assistant"; content: string }[]
  attribution: Record<string, string>
  consentConfirmed: boolean
  leadAlreadySaved: boolean
}

/**
 * What the platform returns. `message`/`leadSaved`/`ui`/`suggestions` are the
 * widget's existing response contract, passed straight through. `fallback` is
 * the platform saying it could not run the turn, so the landing app can swap in
 * copy that names this site's own contact channels.
 */
export type ChatTurnResponse = {
  message: string
  leadSaved: boolean
  ui?: unknown
  suggestions?: string[]
  fallback?: { kind: "no_llm" | "rate_limited" | "error"; retryAfterMs?: number }
}

const CHAT_API_URL = process.env.CHAT_API_URL
const CHAT_API_KEY = process.env.CHAT_API_KEY

/** Whether the chat brain is reachable at all (URL + shared key present). */
export function chatApiConfigured(): boolean {
  return Boolean(CHAT_API_URL && CHAT_API_KEY)
}

/**
 * Run one chat turn on the platform. Never throws; returns `null` whenever the
 * brain is unavailable or the call fails, which the caller treats exactly like
 * "no answer" and degrades to the human hand-off.
 *
 * Deliberately not retried, unlike `forwardLead`: that retries because losing a
 * consented lead is unrecoverable, whereas a chat turn is cheap to re-send and
 * the visitor's transcript is intact either way. A retry here would only double
 * the wait before they see the fallback.
 */
export async function forwardChatTurn(
  payload: ChatTurnPayload,
): Promise<ChatTurnResponse | null> {
  if (!CHAT_API_URL || !CHAT_API_KEY) return null

  try {
    const res = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-chat-key": CHAT_API_KEY,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
    if (!res.ok) {
      console.error("Chat forward failed:", res.status, await res.text().catch(() => ""))
      return null
    }
    const data = (await res.json()) as Partial<ChatTurnResponse>
    if (typeof data.message !== "string") return null
    return {
      message: data.message,
      leadSaved: data.leadSaved === true,
      ...(data.ui ? { ui: data.ui } : {}),
      ...(Array.isArray(data.suggestions) ? { suggestions: data.suggestions } : {}),
      ...(data.fallback ? { fallback: data.fallback } : {}),
    }
  } catch (err) {
    console.error("Chat forward error:", err)
    return null
  }
}
