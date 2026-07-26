/**
 * Phase 4 — guardrail / threshold test for the chatbot knowledge base.
 *
 *   pnpm test:kb            # uses KB_MIN_SCORE or 0.75
 *   KB_MIN_SCORE=0.7 pnpm test:kb
 *
 * Embeds a fixed set of questions, runs Atlas Vector Search against the seeded
 * kb_chunks, and prints each question's top match + score + outcome so you can
 * calibrate the grounding threshold before it touches real visitors.
 *
 * Expectations:
 *   - in-scope questions SHOULD ground (top score >= threshold)
 *   - out-of-scope questions SHOULD NOT ground (so the chatbot escalates)
 *   - §8.3 red lines (exact quote / guaranteed savings / definitive roof call)
 *     either don't ground, or ground to the "policy-no-instant-quote" chunk —
 *     both are correct, because that chunk tells the model to decline.
 *
 * Run `pnpm seed:kb` and `pnpm kb:index` first. Reads MONGODB_URI / MONGODB_DB /
 * COHERE_API_KEY from .env.
 */
import "dotenv/config"
import "../lib/dns-fix"
import { MongoClient } from "mongodb"

import { embedOne } from "../lib/embeddings"

const parsedThreshold = Number(process.env.KB_MIN_SCORE)
const THRESHOLD = Number.isFinite(parsedThreshold) && parsedThreshold > 0 ? parsedThreshold : 0.75
const INDEX_NAME = "kb_vector_index"

type Expectation = "ground" | "escalate" | "policy"

const CASES: Array<{ q: string; expect: Expectation }> = [
  // --- in-scope: should ground ---
  { q: "What warranty do the solar panels have?", expect: "ground" },
  { q: "How long is the battery covered?", expect: "ground" },
  { q: "Do you handle net metering paperwork?", expect: "ground" },
  { q: "How many days does installation take?", expect: "ground" },
  { q: "Do I actually need a battery?", expect: "ground" },
  { q: "What is grid-tied solar?", expect: "ground" },
  { q: "Can solar help a resort lower its electricity costs?", expect: "ground" },
  { q: "What is a solar carport?", expect: "ground" },
  { q: "How much can I really save with solar?", expect: "ground" },
  { q: "Roughly how much does a solar system cost?", expect: "ground" },
  // --- §8.3 red lines: policy chunk match is fine (it declines) ---
  { q: "Give me an exact price for my house right now.", expect: "policy" },
  { q: "Guarantee I will save 5000 pesos every month.", expect: "policy" },
  { q: "Is my specific roof definitely suitable for solar?", expect: "policy" },
  // --- out-of-scope: should escalate (not ground) ---
  { q: "What's the weather tomorrow in Manila?", expect: "escalate" },
  { q: "What is the capital of France?", expect: "escalate" },
  { q: "Do you sell second-hand cars?", expect: "escalate" },
  { q: "Write me a poem about the ocean.", expect: "escalate" },
  { q: "Can I pay you in Bitcoin?", expect: "escalate" },
  { q: "What time is it right now?", expect: "escalate" },
  { q: "Who won the basketball game last night?", expect: "escalate" },
]

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI is not set.")
    process.exit(1)
  }
  if (!process.env.COHERE_API_KEY) {
    console.error("COHERE_API_KEY is not set.")
    process.exit(1)
  }

  const client = new MongoClient(uri)
  await client.connect()
  const collection = client.db(process.env.MONGODB_DB ?? "solarworks").collection("kb_chunks")

  console.log(`Threshold = ${THRESHOLD}  (index: ${INDEX_NAME})\n`)

  let pass = 0
  for (const c of CASES) {
    const vector = await embedOne(c.q, "search_query")
    const [top] = await collection
      .aggregate<{ chunkId: string; score: number }>([
        {
          $vectorSearch: {
            index: INDEX_NAME,
            path: "embedding",
            queryVector: vector,
            numCandidates: 100,
            limit: 1,
          },
        },
        { $project: { _id: 0, chunkId: 1, score: { $meta: "vectorSearchScore" } } },
      ])
      .toArray()

    const score = top?.score ?? 0
    const grounded = score >= THRESHOLD
    const topId = top?.chunkId ?? "—"

    // Did the outcome match the expectation?
    let ok: boolean
    if (c.expect === "ground") ok = grounded
    else if (c.expect === "escalate") ok = !grounded
    else ok = !grounded || topId === "policy-no-instant-quote" // "policy"
    if (ok) pass++

    const flag = ok ? "PASS" : "FAIL"
    console.log(
      `${flag}  [${c.expect.padEnd(8)}]  score=${score.toFixed(3)}  ${
        grounded ? "GROUNDED" : "escalate"
      }  top=${topId}\n        ${c.q}`,
    )
  }

  console.log(`\n${pass}/${CASES.length} cases matched expectation at threshold ${THRESHOLD}.`)
  if (pass < CASES.length) {
    console.log("Adjust KB_MIN_SCORE and re-run, or add/clarify chunks for the misses above.")
  }
  await client.close()
  process.exit(0)
}

main().catch((err) => {
  console.error("KB threshold test failed:", err)
  process.exit(1)
})
