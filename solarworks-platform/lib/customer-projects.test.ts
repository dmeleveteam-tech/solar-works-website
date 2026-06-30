import { test } from "node:test"
import assert from "node:assert/strict"

import { customerScope } from "./customer-projects-access"
import {
  PROJECT_STAGES,
  STAGE_LABEL,
  STAGE_DESCRIPTION,
  stageIndex,
  isProjectStage,
} from "./customer-projects-shared"

/**
 * Unit tests for the security-critical and pure logic behind the customer
 * portal. The data layer itself talks to MongoDB and is exercised manually /
 * in integration; here we lock down the invariants that protect one customer
 * from seeing another's data, plus the stage model the timeline relies on.
 */

test("customerScope binds a query to exactly the caller's id", () => {
  const scope = customerScope("user-123")
  assert.deepEqual(scope, { customerUserId: "user-123" })

  // The scope must contain the ownership key and nothing that could broaden it.
  assert.deepEqual(Object.keys(scope), ["customerUserId"])
})

test("customerScope never collapses to an unscoped (match-all) filter", () => {
  for (const id of ["", "abc", "another-user"]) {
    const scope = customerScope(id) as Record<string, unknown>
    assert.ok("customerUserId" in scope, "scope must carry customerUserId")
    assert.equal(scope.customerUserId, id)
  }
})

test("a scope built for user A never matches user B's id", () => {
  const scopeA = customerScope("user-A")
  assert.notEqual(scopeA.customerUserId, "user-B")
})

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
