/**
 * Client-safe constants, types, and PURE calculations for the Solar Savings
 * Tracker (Phase 2b). Like `customer-projects-shared`, this has NO
 * `server-only`/mongodb import, so Client Components and unit tests can use the
 * enums, labels, shapes, and the savings maths without the database driver.
 * Server-only data access lives in `./savings`; the file parser in
 * `./savings-parser`.
 *
 * Scope note: this is the agreed MVP scaffolding built ahead of the two real
 * Deye export files. Anything that depends on the real file format (column
 * names, units) lives behind the parser and is intentionally NOT pinned here.
 * See "08-Architecture/Feature - Solar Savings Tracker.md".
 */

/**
 * Suggested Philippine utility providers for the tariff table's picker. The
 * tariff table itself is free-form (admin can add any provider name), so this
 * is only a convenience list — not an allow-list.
 */
export const SUGGESTED_PROVIDERS = [
  "Meralco",
  "BATELEC I",
  "BATELEC II",
  "VECO",
  "Davao Light",
  "CEPALCO",
  "BENECO",
  "PELCO",
] as const

/**
 * What a peso saving is measured against. This is the ONE locked decision still
 * pending the client (see the feature spec's open questions): total solar
 * produced, or only the self-consumed portion (excluding energy exported to the
 * grid under net metering). The two give very different figures. We default to
 * `total_production` and surface the assumption on every estimate; switch the
 * default once the client confirms.
 */
export const SAVINGS_BASES = ["total_production", "self_consumed"] as const
export type SavingsBasis = (typeof SAVINGS_BASES)[number]

/** Pending the client's decision — see the spec's "saved" definition question. */
export const DEFAULT_SAVINGS_BASIS: SavingsBasis = "total_production"

export const SAVINGS_BASIS_LABEL: Record<SavingsBasis, string> = {
  total_production: "All solar produced",
  self_consumed: "Self-consumed only",
}

export const SAVINGS_BASIS_DESCRIPTION: Record<SavingsBasis, string> = {
  total_production:
    "Every kWh the system generated, valued at the customer's tariff.",
  self_consumed:
    "Only the kWh the customer used directly (excludes energy exported to the grid).",
}

export function isSavingsBasis(value: unknown): value is SavingsBasis {
  return (
    typeof value === "string" &&
    (SAVINGS_BASES as readonly string[]).includes(value)
  )
}

// --- tariffs ----------------------------------------------------------------

/** A per-provider flat ₱/kWh rate (admin-maintained). Serialized shape. */
export type Tariff = {
  id: string
  provider: string
  /** Philippine pesos per kWh. Flat for the MVP; tiered/TOU is a later option. */
  ratePerKwh: number
  updatedAt: string
}

// --- plant links ------------------------------------------------------------

/**
 * Links a customer (by contact info, not a login — customers never have
 * portal accounts) to their Deye plant/site and the utility provider whose
 * tariff prices their savings. `emailConsentAt` records when the customer
 * agreed to receive savings emails — required before the first send
 * (NFR-03 consent).
 */
export type SavingsPlant = {
  id: string
  customerName: string
  customerEmail: string
  /** Deye / Solarman plant or site identifier (free text for the MVP). */
  plantRef: string
  provider: string
  emailConsentAt: string | null
  createdAt: string
  updatedAt: string
}

// --- monthly readings -------------------------------------------------------

/**
 * One month of generation for a plant. Populated by the parser from an uploaded
 * Deye export. `kwhSelfConsumed`/`kwhExported` are optional because not every
 * export distinguishes them — when absent, only the `total_production` basis can
 * be computed.
 */
export type MonthlyReading = {
  id: string
  plantId: string
  /** Calendar month as `YYYY-MM`. */
  month: string
  kwhProduced: number
  kwhSelfConsumed: number | null
  kwhExported: number | null
  createdAt: string
}

/** `YYYY-MM` month-key validation. */
export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

// --- parser contract (pure; the file reader itself is server-only) -----------

/** A single parsed month, before it is persisted as a `MonthlyReading`. */
export type ParsedReadingRow = Pick<
  MonthlyReading,
  "month" | "kwhProduced" | "kwhSelfConsumed" | "kwhExported"
>

export type ParseResult =
  | { ok: true; rows: ParsedReadingRow[] }
  | { ok: false; error: string }

/** Flip to `true` once the parser is implemented against real Deye exports. */
export const PARSER_CONFIGURED = false

/** Kept as a constant so the UI/actions can match on it. */
export const PARSER_NOT_CONFIGURED_MESSAGE =
  "The Deye export parser is not configured yet. It will be enabled once two real sample files are provided."

/**
 * Validate already-extracted rows (shared by the real parser and by tests). Pure
 * and format-agnostic: enforces a valid `YYYY-MM` month and non-negative kWh.
 */
export function validateRows(rows: ParsedReadingRow[]): ParseResult {
  for (const row of rows) {
    if (!isMonthKey(row.month)) {
      return { ok: false, error: `Invalid month "${row.month}" (expected YYYY-MM).` }
    }
    if (!Number.isFinite(row.kwhProduced) || row.kwhProduced < 0) {
      return { ok: false, error: `Invalid kWh produced for ${row.month}.` }
    }
  }
  return { ok: true, rows }
}

// --- savings maths (PURE; unit-tested) --------------------------------------

/** The billable kWh for a reading under a given basis, or null if unknowable. */
export function billableKwh(
  reading: Pick<MonthlyReading, "kwhProduced" | "kwhSelfConsumed">,
  basis: SavingsBasis,
): number | null {
  if (basis === "self_consumed") {
    return reading.kwhSelfConsumed ?? null
  }
  return reading.kwhProduced
}

/**
 * Estimated peso saving for one month: billable kWh × tariff. Always an
 * estimate — callers must label it so (T-05 / NFR-03). Returns null when the
 * chosen basis can't be computed from the available data.
 */
export function computeMonthlySavings(
  reading: Pick<MonthlyReading, "kwhProduced" | "kwhSelfConsumed">,
  ratePerKwh: number,
  basis: SavingsBasis,
): { kwh: number; estimatedSavings: number } | null {
  const kwh = billableKwh(reading, basis)
  if (kwh === null || !Number.isFinite(ratePerKwh) || ratePerKwh < 0) {
    return null
  }
  return { kwh, estimatedSavings: kwh * ratePerKwh }
}

/** Month-over-month delta (newer − older) in kWh and estimated pesos. */
export function monthOverMonthDelta(
  newer: { kwh: number; estimatedSavings: number },
  older: { kwh: number; estimatedSavings: number },
): { kwh: number; estimatedSavings: number } {
  return {
    kwh: newer.kwh - older.kwh,
    estimatedSavings: newer.estimatedSavings - older.estimatedSavings,
  }
}
