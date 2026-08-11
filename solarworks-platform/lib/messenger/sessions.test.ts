import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

/**
 * Guard tests for the Messenger session document's field wiring.
 *
 * WHY THIS READS THE SOURCE INSTEAD OF IMPORTING IT. `sessions.ts` starts with
 * `import "server-only"` and pulls in `lib/mongodb.ts`, which constructs a
 * MongoClient from a validated `lib/env.ts` at module load. Importing it under a
 * bare `node --test` throws before a single assertion runs — deliberately, since
 * that is what keeps a browser bundle from reaching the database. There is no
 * seam to inject a fake collection through either: `saveSession` and `claimMid`
 * call `messengerSessionsCollection()` directly.
 *
 * What is actually at risk here is not behaviour but WIRING, and wiring is
 * visible in the text. A session field lives in five places — the type, the
 * `emptySession` default, `saveSession`'s `$set`, `claimMid`'s `$setOnInsert`
 * and `resetSession` — and forgetting any one of them fails silently:
 *
 *  - missing from `$set` and the flag is never persisted, so it resets itself on
 *    the next webhook delivery;
 *  - missing from `$setOnInsert` and a thread whose very first event is claimed
 *    by `claimMid` gets a document with the field simply absent, which reads
 *    back as `undefined` rather than `false`;
 *  - missing from `resetSession` and "Start over" leaves it behind.
 *
 * None of those throws, none is caught by typecheck (Mongo's `$set` accepts a
 * partial), and each has to be gone looking for. So the check is generic: every
 * field on the type must appear in all four places, not just the newest one.
 */

const SOURCE = readFileSync(new URL("./sessions.ts", import.meta.url), "utf8")

/** The body of a `{ … }` block, from `opener` to the first line that closes it. */
function block(opener: string, closer: string): string {
  const start = SOURCE.indexOf(opener)
  assert.notEqual(start, -1, `could not find "${opener}" in sessions.ts`)
  const end = SOURCE.indexOf(closer, start + opener.length)
  assert.notEqual(end, -1, `could not find the end of "${opener}" in sessions.ts`)
  return SOURCE.slice(start + opener.length, end)
}

const typeBlock = block("export type MessengerSession = {", "\n}\n")
const emptyBlock = block("function emptySession(psid: string): MessengerSession {", "\n}\n")
const setBlock = block("$set: {", "$setOnInsert:")
// Anchored on the `$push` that only claimMid has: `saveSession` also writes a
// `$setOnInsert`, and the naive search finds that one first.
const setOnInsertBlock = block("$push: { seenMids", "createdAt: new Date(),")
const resetBlock = block(
  "export function resetSession(session: MessengerSession): MessengerSession {",
  "\n}\n",
)

/**
 * Fields that are NOT written by `saveSession`, each for a documented reason —
 * see the comments on `saveSession` and `resetSession`. Anything else missing is
 * a bug, so this list is the one place an exemption has to be argued for.
 */
const NOT_IN_SET = new Set([
  "_id", // the filter, not an update
  "seenMids", // owned exclusively by claimMid; a stale copy would reopen the duplicate-lead race
  "createdAt", // $setOnInsert only
  "updatedAt", // stamped fresh on every write
])

/** Fields a reset deliberately preserves — the idempotency ledger and how they found us. */
const NOT_RESET = new Set(["_id", "seenMids", "attribution", "createdAt", "updatedAt"])

const FIELDS = [...typeBlock.matchAll(/^ {2}(\w+): /gm)].map((m) => m[1])

test("the session type declares the fields this module is built around", () => {
  // A sanity check on the regex above: if the type's formatting changes and the
  // scrape silently returns nothing, every assertion below would pass vacuously.
  for (const field of ["messages", "consentConfirmed", "humanHandoff", "chosePaperForm"]) {
    assert.ok(FIELDS.includes(field), `"${field}" was not scraped from MessengerSession`)
  }
})

test("every persisted session field is written by saveSession", () => {
  for (const field of FIELDS) {
    if (NOT_IN_SET.has(field)) continue
    assert.match(
      setBlock,
      new RegExp(`\\b${field}: session\\.${field}\\b`),
      `"${field}" is on MessengerSession but never written in saveSession's $set — it will not survive the turn`,
    )
  }
})

test("every session field has a default in emptySession and in claimMid's insert", () => {
  for (const field of FIELDS) {
    if (field === "_id" || field === "createdAt" || field === "updatedAt") continue
    assert.match(emptyBlock, new RegExp(`\\b${field}:`), `"${field}" has no default in emptySession`)
    if (field === "seenMids") continue // claimMid writes it through $push, not the insert
    assert.match(
      setOnInsertBlock,
      new RegExp(`\\b${field}:`),
      `"${field}" is missing from claimMid's $setOnInsert — a thread whose first event is a claim gets undefined, not false`,
    )
  }
})

test("resetSession clears everything except the ledger and the attribution", () => {
  for (const field of FIELDS) {
    if (NOT_RESET.has(field)) continue
    assert.match(
      resetBlock,
      new RegExp(`session\\.${field} = `),
      `"${field}" survives resetSession — "Start over" would not actually start over`,
    )
  }
  // The two that must NOT be touched. Dropping seenMids reopens the duplicate-lead
  // race at the exact moment the visitor is about to be re-qualified; dropping
  // attribution re-files a campaign lead as organic traffic.
  assert.ok(!/session\.seenMids = /.test(resetBlock), "resetSession must not clear seenMids")
  assert.ok(!/session\.attribution = /.test(resetBlock), "resetSession must not clear attribution")
})

/**
 * The Google Form flag specifically. It is not a hand-off and must never be
 * implemented as one: the bot keeps answering questions from someone who has the
 * form open, it just must not re-run the assessment at them. Conflating the two
 * would silence the bot for a visitor who is mid-form and most likely to ask
 * something.
 */
test("chosePaperForm is wired through, and is not a second humanHandoff", () => {
  assert.match(typeBlock, /chosePaperForm: boolean/)
  assert.match(emptyBlock, /chosePaperForm: false/)
  assert.match(setBlock, /chosePaperForm: session\.chosePaperForm/)
  assert.match(setOnInsertBlock, /chosePaperForm: false/)
  assert.match(resetBlock, /session\.chosePaperForm = false/)
  // A tapped form is state worth confirming before a reset destroys it.
  assert.match(
    block("export function hasResettableState(session: MessengerSession): boolean {", "\n}\n"),
    /session\.chosePaperForm/,
  )
})
