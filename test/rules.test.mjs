import test from "node:test";
import assert from "node:assert/strict";
import { isLocked, isOverdue } from "../lib/rules.ts";

const MIN = 60 * 1000;
const now = Date.UTC(2026, 10, 24, 12, 0, 0);

test("unlocked at 59 minutes", () => {
  assert.equal(isLocked({ createdAt: now - 59 * MIN }, now), false);
});
test("locked at 61 minutes", () => {
  assert.equal(isLocked({ createdAt: now - 61 * MIN }, now), true);
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
