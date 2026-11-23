import test from "node:test";
import assert from "node:assert/strict";
import { addDays, addMonths } from "../lib/dates.ts";

test("addDays crosses month and year", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});
test("addDays +-7", () => {
  assert.equal(addDays("2026-11-24", 7), "2026-12-01");
  assert.equal(addDays("2026-11-03", -7), "2026-10-27");
});
test("addMonths clamps to month length", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonths("2026-03-31", -1), "2026-02-28");
});
test("addMonths crosses year", () => {
  assert.equal(addMonths("2026-12-15", 1), "2027-01-15");
  assert.equal(addMonths("2026-01-15", -1), "2025-12-15");
});
