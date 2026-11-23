import test from "node:test";
import assert from "node:assert/strict";
import { canDelete, isOverdue } from "../lib/rules.ts";

const MIN = 60 * 1000;
const now = Date.UTC(2026, 10, 24, 12, 0, 0);

test("canDelete at 59 minutes is true", () => {
  assert.equal(canDelete(now - 59 * MIN, now), true);
});
test("canDelete at 61 minutes is false", () => {
  assert.equal(canDelete(now - 61 * MIN, now), false);
});
test("isOverdue: past uncompleted is true", () => {
  assert.equal(isOverdue({ date: "2026-11-23", completed: false }, "2026-11-24"), true);
});
test("isOverdue: past completed is false", () => {
  assert.equal(isOverdue({ date: "2026-11-23", completed: true }, "2026-11-24"), false);
});
test("isOverdue: today is false", () => {
  assert.equal(isOverdue({ date: "2026-11-24", completed: false }, "2026-11-24"), false);
});
