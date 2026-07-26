import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { env } from "@/lib/env"
import { searchKb } from "@/lib/kb"

/**
 * Knowledge-base retrieval endpoint for the marketing site's chatbot.
 *
 * The landing app's `/api/chat` posts a visitor's open-ended question here
 * (server-to-server, with the shared `x-kb-key`). We embed it, run Atlas Vector
 * Search over the approved `kb_chunks`, and return the top matches plus whether
 * the best one clears the grounding threshold. The chatbot uses `grounded` to
 * decide between answering from the returned context and falling back to the
 * §8.3 "an adviser will confirm" escalation.
 *
 * Deny by default: with no COHERE_API_KEY / KB_SEARCH_KEY configured the
 * endpoint is closed, and the chatbot degrades to its prompt-only behaviour.
 */

const bodySchema = z.object({
  query: z.string().trim().min(1).max(1000),
  k: z.number().int().min(1).max(10).optional(),
})

/** Constant-time key comparison that tolerates differing lengths. */
function keyMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  if (!env.COHERE_API_KEY || !env.KB_SEARCH_KEY) {
    return NextResponse.json(
      { ok: false, error: "KB search is not configured." },
      { status: 503 },
    )
  }
  if (!keyMatches(req.headers.get("x-kb-key"), env.KB_SEARCH_KEY)) {
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
    return NextResponse.json({ ok: false, error: "Invalid query." }, { status: 422 })
  }

  try {
    const { grounded, matches } = await searchKb(parsed.data.query, { k: parsed.data.k })
    return NextResponse.json({
      ok: true,
      grounded,
      matches: matches.map((m) => ({
        category: m.category,
        question: m.question,
        content: m.content,
        score: m.score,
      })),
    })
  } catch (err) {
    console.error("KB search error:", err)
    // Fail soft: the chatbot treats an error like "not grounded" and escalates.
    return NextResponse.json(
      { ok: false, error: "KB search failed." },
      { status: 502 },
    )
  }
}
