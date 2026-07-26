/**
 * Create the Atlas Vector Search index that the chatbot retrieval depends on.
 *
 *   pnpm kb:index
 *
 * Run this once against your Atlas cluster (Vector Search is an Atlas feature —
 * it does not exist on a plain local mongod). It's safe to re-run: if the index
 * already exists we report that and exit cleanly. Index builds are asynchronous,
 * so `searchKb` may return nothing for a minute after creation while it builds.
 *
 * The dimension + similarity here MUST match the embedding model (see
 * lib/embeddings.ts). Reads MONGODB_URI / MONGODB_DB from .env.
 */
import "dotenv/config"
import "../lib/dns-fix"
import { MongoClient } from "mongodb"

import { EMBED_DIMS } from "../lib/embeddings"

const INDEX_NAME = "kb_vector_index"

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI is not set.")
    process.exit(1)
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(process.env.MONGODB_DB ?? "solarworks")

  // createSearchIndex needs the collection to exist first.
  const names = await db.listCollections({ name: "kb_chunks" }).toArray()
  if (names.length === 0) {
    await db.createCollection("kb_chunks")
    console.log("Created empty kb_chunks collection.")
  }

  const collection = db.collection("kb_chunks")

  // Already there? Report and stop — createSearchIndex would otherwise error.
  const existing = await collection.listSearchIndexes().toArray().catch(() => [])
  if (existing.some((idx) => idx.name === INDEX_NAME)) {
    console.log(`✓ Index "${INDEX_NAME}" already exists — nothing to do.`)
    await client.close()
    process.exit(0)
  }

  await collection.createSearchIndex({
    name: INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: EMBED_DIMS,
          similarity: "cosine",
        },
      ],
    },
  })

  console.log(
    `✓ Requested vector index "${INDEX_NAME}" (${EMBED_DIMS}d, cosine). It builds asynchronously — give it a minute before querying.`,
  )
  await client.close()
  process.exit(0)
}

main().catch((err) => {
  console.error("KB index creation failed:", err)
  console.error(
    "Note: Atlas Vector Search requires an Atlas cluster (M0 free tier is fine); it is unavailable on a local mongod.",
  )
  process.exit(1)
})
