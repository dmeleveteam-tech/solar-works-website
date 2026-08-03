import { test } from "node:test"
import assert from "node:assert/strict"

import {
  PROJECT_STAGES,
  STAGE_LABEL,
  STAGE_DESCRIPTION,
  stageIndex,
  isProjectStage,
} from "./customer-projects-shared"

/**
 * Unit tests for the pure logic behind customer projects — the data layer
 * itself talks to MongoDB and is exercised manually / in integration; here we
 * lock down the stage model the staff-facing timeline relies on.
 */

test("every stage has a label and a description", () => {
  for (const stage of PROJECT_STAGES) {
    assert.equal(typeof STAGE_LABEL[stage], "string")
    assert.ok(STAGE_LABEL[stage].length > 0)
    assert.equal(typeof STAGE_DESCRIPTION[stage], "string")
    assert.ok(STAGE_DESCRIPTION[stage].length > 0)
  }
})

test("stageIndex reflects array order and is monotonic", () => {
  PROJECT_STAGES.forEach((stage, i) => {
    assert.equal(stageIndex(stage), i)
  })
  assert.ok(stageIndex("assessment") < stageIndex("energized"))
})

test("isProjectStage accepts valid stages and rejects anything else", () => {
  assert.ok(isProjectStage("assessment"))
  assert.ok(isProjectStage("after_sales"))
  assert.equal(isProjectStage("nope"), false)
  assert.equal(isProjectStage(""), false)
  assert.equal(isProjectStage(null), false)
  assert.equal(isProjectStage(42), false)
})
