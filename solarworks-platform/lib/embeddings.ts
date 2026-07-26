/**
 * Cohere embeddings wrapper for the chatbot knowledge base (RAG).
 *
 * Deliberately dependency-light and free of `server-only`/`@/` imports so it can
 * be used from BOTH the Next.js server (the `/api/kb/search` route) and the
 * standalone `seed-kb` node script. It reads `COHERE_API_KEY` straight from
 * `process.env` rather than through `lib/env`, for the same reason.
 *
 * Cohere requires the correct `input_type` per call: `search_document` when
 * embedding the knowledge chunks at ingest time, and `search_query` when
 * embedding a visitor's question at retrieval time. Mixing them up quietly
 * degrades similarity scores, so callers must pass the right one.
 */

export const EMBED_MODEL = "embed-multilingual-v3.0"
/** Vector length produced by EMBED_MODEL — must match the Atlas index definition. */
export const EMBED_DIMS = 1024

export type EmbedInputType = "search_document" | "search_query"

const COHERE_EMBED_URL = "https://api.cohere.com/v2/embed"

/** True when a Cohere key is configured. Callers should degrade gracefully when false. */
export function embeddingsConfigured(): boolean {
  return Boolean(process.env.COHERE_API_KEY)
}

type CohereEmbedResponse = {
  embeddings?: { float?: number[][] }
  message?: string
}

/**
 * Embed one or more strings. Returns one vector (length `EMBED_DIMS`) per input,
 * in the same order. Throws on a missing key or a non-OK Cohere response — the
 * caller decides whether to swallow that (retrieval) or fail loudly (seeding).
 */
export async function embed(
  texts: string[],
  inputType: EmbedInputType,
): Promise<number[][]> {
  const key = process.env.COHERE_API_KEY
  if (!key) throw new Error("COHERE_API_KEY is not set")
  if (texts.length === 0) return []

  const res = await fetch(COHERE_EMBED_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      texts,
      input_type: inputType,
      embedding_types: ["float"],
    }),
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Cohere embed error ${res.status}: ${detail}`)
  }

  const data = (await res.json()) as CohereEmbedResponse
  const vectors = data.embeddings?.float
  if (!vectors || vectors.length !== texts.length) {
    throw new Error("Cohere embed returned an unexpected shape")
  }
  return vectors
}

/** Convenience for the common single-string case. */
export async function embedOne(
  text: string,
  inputType: EmbedInputType,
): Promise<number[]> {
  const [vector] = await embed([text], inputType)
  return vector
}
