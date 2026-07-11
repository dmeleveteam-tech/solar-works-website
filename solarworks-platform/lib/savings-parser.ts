import "server-only"

import { PARSER_NOT_CONFIGURED_MESSAGE, type ParseResult } from "./savings-shared"

/**
 * Deye / Solarman monthly-export parser — INTENTIONALLY A STUB.
 *
 * The real column names, units, and date format can only be pinned against two
 * real sample files, which the client has not yet supplied (see the feature
 * spec's open questions and the Phase-2b blocker). Rather than guess a format
 * that would have to be reworked, the stable interface the rest of the feature
 * codes against lives in `./savings-shared` (`ParsedReadingRow`, `ParseResult`,
 * `validateRows`, `PARSER_CONFIGURED`). This module holds only the file reader,
 * which is `server-only` because it will do file IO once implemented.
 *
 * To finish this once the sample files arrive:
 *   1. Inspect the two exports (CSV vs XLSX, header row, kWh column, month/date
 *      column, whether self-consumption / export columns exist).
 *   2. Implement the row mapping below and validate via `validateRows`.
 *   3. Add a CSV (and, if needed, XLSX) reader; keep this signature.
 *   4. Flip `PARSER_CONFIGURED` to `true` in `./savings-shared` and add fixture
 *      tests using the real sample files.
 */

// Re-export the pure contract so callers can import everything from one place.
export {
  PARSER_CONFIGURED,
  PARSER_NOT_CONFIGURED_MESSAGE,
  validateRows,
  type ParsedReadingRow,
  type ParseResult,
} from "./savings-shared"

/**
 * Parse a raw uploaded Deye monthly export into month rows. Currently a stub:
 * returns the not-configured error until the format is pinned from real files.
 * The `raw`/`name` inputs are accepted now so the action and UI are wired
 * end-to-end; the real implementation will read `raw` and branch on `name`
 * (CSV vs XLSX).
 */
export function parseDeyeExport(raw: Uint8Array, name: string): ParseResult {
  void raw
  void name
  return { ok: false, error: PARSER_NOT_CONFIGURED_MESSAGE }
}
