import "server-only"
import type { ObjectId } from "mongodb"

import { db } from "./mongodb"

/**
 * Human-readable lead references — the spec's `Lead ID`, `SW-YYYYMMDD-####`.
 *
 * The ObjectId is the real primary key; this is the string staff say out loud,
 * paste into a spreadsheet cell, and search the inbox for. The date segment is
 * Philippine-time so a lead captured at 08:00 Manila reads as today, not
 * yesterday-UTC, and the counter restarts each day.
 *
 * The sequence is a single atomic `$inc` on a `counters` document, so two
 * concurrent captures can never be handed the same number — an upsert with
 * `returnDocument: "after"` is exactly the pattern this collection exists for.
 */

type CounterDoc = { _id: string; seq: number }

/**
 * The `YYYYMMDD` date segment of a reference, in Philippine time.
 *
 * Manila rather than UTC because the counter restarts on the local business
 * day: a lead captured at 08:00 Manila must read as today, not as yesterday-UTC
 * (Manila is UTC+8, so the first eight hours of every local day would otherwise
 * be filed under the previous date).
 */
function manilaDateStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ""

  return `${get("year")}${get("month")}${get("day")}`
}

/**
 * The next reference for a lead captured at `now`.
 *
 * Never throws: a lead must be captured even if the counter round-trip fails.
 * The fallback keeps the same shape and stays unique by borrowing the tail of
 * the ObjectId, so a degraded reference is still a usable one — it just isn't
 * sequential.
 */
export async function nextLeadRefId(now: Date, id: ObjectId): Promise<string> {
  const stamp = manilaDateStamp(now)

  try {
    const doc = await db
      .collection<CounterDoc>("counters")
      .findOneAndUpdate(
        { _id: `leads-${stamp}` },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after" },
      )

    const seq = doc?.seq
    if (typeof seq === "number") {
      return `SW-${stamp}-${String(seq).padStart(4, "0")}`
    }
    console.error("Lead reference counter returned no sequence; falling back")
  } catch (err) {
    console.error("Lead reference counter failed:", err)
  }

  return `SW-${stamp}-${id.toHexString().slice(-4).toUpperCase()}`
}
