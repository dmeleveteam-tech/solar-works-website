/**
 * Embed the approved knowledge-base chunks and upsert them into `kb_chunks`.
 *
 *   pnpm seed:kb
 *
 * Idempotent: each chunk is upserted by its stable `chunkId`, so editing the
 * text in `lib/kb/source-content.ts` and re-running updates that row in place
 * (and re-embeds it). Reads MONGODB_URI / MONGODB_DB / COHERE_API_KEY from .env.
 *
 * Run `pnpm kb:index` once (before or after) to create the Atlas Vector Search
 * index the chatbot retrieval depends on.
 */
import "dotenv/config"
import "../lib/dns-fix"
import { MongoClient } from "mongodb"

import { KB_SOURCE_CHUNKS } from "../lib/kb/source-content"
import { embed, EMBED_DIMS, EMBED_MODEL } from "../lib/embeddings"

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI is not set.")
    process.exit(1)
  }
  if (!process.env.COHERE_API_KEY) {
    console.error("COHERE_API_KEY is not set (needed to embed the chunks).")
    process.exit(1)
  }

  console.log(`Embedding ${KB_SOURCE_CHUNKS.length} chunks with ${EMBED_MODEL} (${EMBED_DIMS}d)…`)
  const vectors = await embed(
    KB_SOURCE_CHUNKS.map((c) => c.content),
    "search_document",
  )

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(process.env.MONGODB_DB ?? "solarworks")
  const now = new Date()

  let n = 0
  for (const [i, chunk] of KB_SOURCE_CHUNKS.entries()) {
    const embedding = vectors[i]
    if (embedding.length !== EMBED_DIMS) {
      throw new Error(
        `Chunk "${chunk.chunkId}" embedded to ${embedding.length}d, expected ${EMBED_DIMS}d`,
      )
    }
    await db.collection("kb_chunks").updateOne(
      { chunkId: chunk.chunkId },
      {
        $set: {
          chunkId: chunk.chunkId,
          category: chunk.category,
          question: chunk.question,
          content: chunk.content,
          embedding,
          updatedAt: now,
        },
      },
      { upsert: true },
    )
    n++
  }

  const total = await db.collection("kb_chunks").countDocuments()
  const sample = await db.collection("kb_chunks").findOne({})
  console.log(`✓ Upserted ${n} chunks. Collection now holds ${total} docs.`)
  console.log(
    `  Sanity check — sample "${sample?.chunkId}" embedding length: ${
      Array.isArray(sample?.embedding) ? sample?.embedding.length : "MISSING"
    }`,
  )

  await client.close()
  process.exit(0)
}

main().catch((err) => {
  console.error("KB seed failed:", err)
  process.exit(1)
})
