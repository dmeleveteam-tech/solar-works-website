import { test } from "node:test"
import assert from "node:assert/strict"

import {
  SAVINGS_BASES,
  DEFAULT_SAVINGS_BASIS,
  isSavingsBasis,
  isMonthKey,
  billableKwh,
  computeMonthlySavings,
  monthOverMonthDelta,
  validateRows,
  PARSER_CONFIGURED,
} from "./savings-shared"

/**
 * Unit tests for the pure savings maths and validation behind the Solar Savings
 * Tracker. The data layer talks to MongoDB and is exercised manually; here we
 * lock down the calculations and the basis/month invariants the feature relies
 * on. The Deye parser is still stubbed — these tests assert that contract too.
 */

test("savings basis enum is well-formed", () => {
  assert.ok(SAVINGS_BASES.includes(DEFAULT_SAVINGS_BASIS))
  assert.ok(isSavingsBasis("total_production"))
  assert.ok(isSavingsBasis("self_consumed"))
  assert.equal(isSavingsBasis("guaranteed"), false)
  assert.equal(isSavingsBasis(null), false)
})

test("billableKwh picks the field the basis requires", () => {
  const reading = { kwhProduced: 500, kwhSelfConsumed: 300 }
  assert.equal(billableKwh(reading, "total_production"), 500)
  assert.equal(billableKwh(reading, "self_consumed"), 300)
})

test("billableKwh returns null when self-consumption is unknown", () => {
  const reading = { kwhProduced: 500, kwhSelfConsumed: null }
  // total_production is always computable...
  assert.equal(billableKwh(reading, "total_production"), 500)
  // ...but self_consumed can't be computed without the data.
  assert.equal(billableKwh(reading, "self_consumed"), null)
})

test("computeMonthlySavings = billable kWh × tariff", () => {
  const reading = { kwhProduced: 400, kwhSelfConsumed: 250 }
  const total = computeMonthlySavings(reading, 12.5, "total_production")
  assert.deepEqual(total, { kwh: 400, estimatedSavings: 5000 })

  const self = computeMonthlySavings(reading, 12.5, "self_consumed")
  assert.deepEqual(self, { kwh: 250, estimatedSavings: 3125 })
})

test("computeMonthlySavings rejects bad tariffs and missing data", () => {
  const reading = { kwhProduced: 400, kwhSelfConsumed: null }
  assert.equal(computeMonthlySavings(reading, -1, "total_production"), null)
  assert.equal(computeMonthlySavings(reading, Number.NaN, "total_production"), null)
  assert.equal(computeMonthlySavings(reading, 12.5, "self_consumed"), null)
})

test("monthOverMonthDelta subtracts older from newer", () => {
  const newer = { kwh: 500, estimatedSavings: 6250 }
  const older = { kwh: 400, estimatedSavings: 5000 }
  assert.deepEqual(monthOverMonthDelta(newer, older), {
    kwh: 100,
    estimatedSavings: 1250,
  })
})

test("isMonthKey accepts YYYY-MM and rejects anything else", () => {
  assert.ok(isMonthKey("2026-01"))
  assert.ok(isMonthKey("2026-12"))
  assert.equal(isMonthKey("2026-13"), false)
  assert.equal(isMonthKey("2026-00"), false)
  assert.equal(isMonthKey("2026-1"), false)
  assert.equal(isMonthKey("2026/01"), false)
  assert.equal(isMonthKey(202601), false)
})

test("parser stays stubbed until real sample files are provided", () => {
  // Guards against accidentally shipping a half-configured parser.
  assert.equal(PARSER_CONFIGURED, false)
})

test("validateRows enforces month format and non-negative kWh", () => {
  assert.deepEqual(
    validateRows([{ month: "2026-01", kwhProduced: 100, kwhSelfConsumed: null, kwhExported: null }]),
    { ok: true, rows: [{ month: "2026-01", kwhProduced: 100, kwhSelfConsumed: null, kwhExported: null }] },
  )

  const badMonth = validateRows([
    { month: "Jan 2026", kwhProduced: 100, kwhSelfConsumed: null, kwhExported: null },
  ])
  assert.equal(badMonth.ok, false)

  const badKwh = validateRows([
    { month: "2026-01", kwhProduced: -5, kwhSelfConsumed: null, kwhExported: null },
  ])
  assert.equal(badKwh.ok, false)
})
