import "server-only"
import { ObjectId, type Collection } from "mongodb"

import { db } from "./mongodb"
import { embedOne } from "./embeddings"

/**
 * Knowledge-base data layer for the chatbot RAG pipeline.
 *
 * `kb_chunks` holds the approved content chunks plus their Cohere embedding. A
 * visitor's open-ended question is embedded and matched against these via Atlas
 * Vector Search (`$vectorSearch`), so the chatbot answers from approved content
 * rather than the model's training data. `kb_queries` logs every retrieval for
 * Phase 6 monitoring (which questions ground vs. escalate).
 *
 * The vector index (`KB_INDEX_NAME`) must exist in Atlas before `searchKb`
 * works — create it once with `pnpm kb:index`.
 */

export const KB_INDEX_NAME = "kb_vector_index"

/** Default similarity cutoff below which we treat retrieval as "no good match"
 *  and let the chatbot fall back to the §8.3 escalation. Tunable via env; Phase 4
 *  exists to calibrate it. Atlas normalizes cosine to [0,1]. A blank or invalid
 *  KB_MIN_SCORE falls back to 0.75 (Number("") is 0, which would ground
 *  everything — guard against it explicitly). */
function parseMinScore(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0.75
}
export const DEFAULT_MIN_SCORE = parseMinScore(process.env.KB_MIN_SCORE)

export type KbChunkDoc = {
  _id: ObjectId
  chunkId: string
  category: string
  question: string
  content: string
  embedding: number[]
  updatedAt: Date
}

export type KbMatch = {
  chunkId: string
  category: string
  question: string
  content: string
  /** Atlas vectorSearchScore, normalized to [0,1]. */
  score: number
}

export type KbSearchResult = {
  /** True when the top match clears the threshold — safe to answer from. */
  grounded: boolean
  matches: KbMatch[]
}

export function kbChunksCollection(): Collection<KbChunkDoc> {
  return db.collection<KbChunkDoc>("kb_chunks")
}

type KbQueryDoc = {
  _id: ObjectId
  query: string
  topChunkId: string | null
  topScore: number | null
  grounded: boolean
  k: number
  createdAt: Date
}

function kbQueriesCollection(): Collection<KbQueryDoc> {
  return db.collection<KbQueryDoc>("kb_queries")
}

/**
 * Embed `query` and return the top-k most similar approved chunks, newest
 * ranking first. `grounded` reflects whether the best match clears `minScore`.
 * Every call is logged to `kb_queries` (fire-and-forget) for monitoring.
 */
export async function searchKb(
  query: string,
  opts: { k?: number; minScore?: number } = {},
): Promise<KbSearchResult> {
  const k = Math.min(Math.max(opts.k ?? 3, 1), 10)
  const minScore = opts.minScore ?? DEFAULT_MIN_SCORE

  const queryVector = await embedOne(query, "search_query")

  const matches = (await kbChunksCollection()
    .aggregate<KbMatch>([
      {
        $vectorSearch: {
          index: KB_INDEX_NAME,
          path: "embedding",
          queryVector,
          numCandidates: Math.max(100, k * 20),
          limit: k,
        },
      },
      {
        $project: {
          _id: 0,
          chunkId: 1,
          category: 1,
          question: 1,
          content: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ])
    .toArray()) as KbMatch[]

  const top = matches[0]
  const grounded = Boolean(top && top.score >= minScore)

  // Fire-and-forget telemetry: monitoring must never slow or break retrieval.
  void kbQueriesCollection()
    .insertOne({
      _id: new ObjectId(),
      query: query.slice(0, 500),
      topChunkId: top?.chunkId ?? null,
      topScore: top?.score ?? null,
      grounded,
      k,
      createdAt: new Date(),
    })
    .catch(() => {})

  return { grounded, matches }
}
