import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { MAX_CONTENT, MAX_MESSAGES, runChatTurn } from "@/lib/chat/brain"
import { chatApiEnabled, env } from "@/lib/env"
import { clientKey, createRateLimiter, rateLimitHeaders } from "@/lib/rate-limit"

/**
 * Chat endpoint for the marketing site's Solar Assistant widget.
 *
 * The landing app's `/api/chat` is a thin proxy in front of this: it posts the
 * running transcript here server-to-server with the shared `x-chat-key`, and we
 * run the turn (`lib/chat/brain.ts`) against the LLM, the knowledge base and the
 * leads inbox — all of which now live in this app. The response JSON is the same
 * shape the widget has always consumed, so no client component changed.
 *
 * Modelled on `/api/kb/search`: deny by default when unconfigured, constant-time
 * key comparison, zod-validated body. The rate limiter is a backstop on the
 * endpoint itself (the landing app limits its own visitors in front of this), so
 * a leaked chat key or a stuck retry loop can't burn the provider's token
 * budget. It sits before the key check because rejecting floods cheaply is the
 * point — real chat volume is nowhere near it.
 */

// Room for a rate-limit wait plus both model calls. Without this the platform
// default (10s on some plans) would kill the retry mid-wait.
export const maxDuration = 30

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
})

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1),
  // Marketing attribution is re-filtered by the brain against its own whitelist
  // (L-04), so anything unexpected here is dropped rather than rejected.
  attribution: z.record(z.string().max(80), z.string()).optional(),
  consentConfirmed: z.boolean().optional(),
  leadAlreadySaved: z.boolean().optional(),
})

/** Constant-time key comparison that tolerates differing lengths. */
function keyMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// One turn costs up to two model calls, so this is deliberately tighter than the
// lead-ingest limit: a single caller looping here is expensive, not just noisy.
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 })

export async function POST(req: Request) {
  const verdict = limiter.check(clientKey(req.headers))
  if (!verdict.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: rateLimitHeaders(verdict) },
    )
  }

  if (!chatApiEnabled || !env.CHAT_API_KEY) {
    // Deny by default: no provider key or no shared secret means the endpoint is
    // closed, and the marketing site falls back to its human hand-off message.
    return NextResponse.json({ ok: false, error: "Chat is not configured." }, { status: 503 })
  }
  if (!keyMatches(req.headers.get("x-chat-key"), env.CHAT_API_KEY)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 422 })
  }

  // Clamp before the brain sees it: these guards keep a hostile or runaway
  // client from blowing up token usage, and they are the caller's job because
  // `runChatTurn` trusts the transcript it is handed.
  const messages = parsed.data.messages
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) }))

  const result = await runChatTurn({
    messages,
    attribution: parsed.data.attribution ?? {},
    // Set by the client only after the visitor ticks the consent checkbox.
    consentConfirmed: parsed.data.consentConfirmed === true,
    // Guards against the model firing save_lead twice in one conversation — the
    // "never call it twice" instruction was previously prompt-only.
    leadAlreadySaved: parsed.data.leadAlreadySaved === true,
    channel: "web",
  })

  return NextResponse.json(result)
}
