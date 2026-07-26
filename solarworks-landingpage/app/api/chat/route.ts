import { NextResponse } from "next/server"

import { forwardChatTurn } from "@/lib/chat-proxy"
import { siteConfig } from "@/lib/site-config"

/**
 * Public edge for the Solar Assistant chatbot (build guide: "AI Lead Chatbot").
 * The brain itself — system prompt, tools, LLM calls, `save_lead` — now lives in
 * the platform app (`lib/chat/brain.ts`, behind its own `POST /api/chat`), so
 * that the web widget and Messenger run identical logic against the same
 * knowledge base and leads inbox. This route is the thin proxy in front of it.
 *
 * What stays here is what belongs at the public edge: clamping a hostile or
 * runaway client's input, whitelisting attribution so the browser can't stuff
 * the lead document, and the visitor-facing fallback copy — which names this
 * site's own contact channels and so is the marketing site's to own. The
 * response shape the browser sees is unchanged.
 */

// Input guards: keep a hostile or runaway client from blowing up token usage.
const MAX_MESSAGES = 40
const MAX_CONTENT = 2000

// Room for the platform's rate-limit wait plus both model calls. Without this
// the platform default (10s on some plans) would kill the request mid-turn.
export const maxDuration = 30

type Role = "user" | "assistant"
type ChatMessage = { role: Role; content: string }

// A bare path like "/contact" is meaningless to read in a chat bubble, so point
// at the buttons the widget already shows instead.
const HUMAN_FALLBACK = `I'm not available to chat right now, but our team is — tap "Assessment form" just below to send your details, or message us on Viber (${siteConfig.contact.whatsapp.value}) and a real person will help you straight away.`

/**
 * Above this, the wait is not something to ask a visitor to sit through — it
 * means the daily token budget is gone, not that this minute is busy.
 */
const LONG_WAIT_MS = 120_000

/**
 * Shown when the provider rate-limits us even after the retry. Deliberately not
 * the hand-off above: the visitor's answers are all still in the transcript, so
 * re-sending one message picks up exactly where they left off — telling them to
 * go and fill in a form instead threw the whole qualification away.
 */
const rateLimitFallback = (retryAfterMs: number): string => {
  // A long wait means the day's budget is spent, not that this minute is busy —
  // "send that again in a moment" would simply be untrue, so hand off instead.
  if (retryAfterMs >= LONG_WAIT_MS) {
    return `Sorry — I'm out of capacity for a little while, so I can't answer properly right now. Our team still can: tap "Assessment form" just below to send your details, or message us on Viber (${siteConfig.contact.whatsapp.value}) and a real person will help you straight away.`
  }
  const seconds = Math.max(5, Math.ceil(retryAfterMs / 1000))
  const wait = seconds >= 45 ? "a minute" : `about ${seconds} seconds`
  return `Sorry — I'm handling a lot of chats right now and need ${wait} to catch up. Send that again in a moment and I'll pick up right where we left off. In a hurry? Message us on Viber (${siteConfig.contact.whatsapp.value}).`
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

// Marketing attribution keys accepted from the browser (L-04). Anything else is
// ignored so the chat client can't stuff the lead document.
const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "landing_page",
  "referrer",
] as const

/** Keep only the whitelisted attribution keys, each trimmed and capped. */
function cleanAttribution(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    for (const key of ATTRIBUTION_KEYS) {
      const value = str(obj[key]).slice(0, 300)
      if (value) out[key] = value
    }
  }
  return out
}

export async function POST(req: Request) {
  // Validate input shape before doing anything else.
  let body: {
    messages?: unknown
    attribution?: unknown
    consentConfirmed?: unknown
    leadAlreadySaved?: unknown
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
  const attribution = cleanAttribution(body.attribution)
  // Set by the client only after the visitor ticks the consent checkbox.
  const consentConfirmed = body.consentConfirmed === true
  // Guards against the model firing save_lead twice in one conversation — the
  // "never call it twice" instruction was previously prompt-only.
  const leadAlreadySaved = body.leadAlreadySaved === true
  const history: ChatMessage[] = body.messages
    .slice(-MAX_MESSAGES)
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) }))

  if (history.length === 0) {
    return NextResponse.json({ error: "No messages." }, { status: 400 })
  }

  const result = await forwardChatTurn({
    messages: history,
    attribution,
    consentConfirmed,
    leadAlreadySaved,
  })

  // Unconfigured or unreachable brain → hand off to humans gracefully, exactly
  // as the route used to when no LLM key was set.
  if (!result) {
    return NextResponse.json({
      message: HUMAN_FALLBACK,
      leadSaved: false,
      // Dev only — the visitor must never see internals (NFR-02), but silently
      // swallowing failures made this route very hard to diagnose.
      ...(process.env.NODE_ENV !== "production"
        ? { debugError: "chat brain unavailable (CHAT_API_URL/CHAT_API_KEY or upstream failure)" }
        : {}),
    })
  }

  // A rate limit is temporary and the transcript is intact, so keep the
  // conversation alive instead of sending them off to a form. The platform's own
  // wording can't name this site's Viber number, so ours replaces it.
  if (result.fallback?.kind === "rate_limited") {
    return NextResponse.json({
      message: rateLimitFallback(result.fallback.retryAfterMs ?? 0),
      leadSaved: false,
      ...(process.env.NODE_ENV !== "production"
        ? { debugError: `rate_limited retryAfterMs=${result.fallback.retryAfterMs ?? 0}` }
        : {}),
    })
  }

  return NextResponse.json(result)
}
