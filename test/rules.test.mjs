import test from "node:test";
import assert from "node:assert/strict";
import { canPatch, isLocked, isOverdue } from "../lib/rules.ts";

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

const old = { createdAt: now - 61 * MIN, completed: false };
test("locked PATCH completed:true allowed", () => {
  assert.equal(canPatch(old, { completed: true }, now), true);
});
test("locked PATCH completed:false rejected", () => {
  assert.equal(canPatch({ ...old, completed: true }, { completed: false }, now), false);
});
test("locked PATCH text rejected", () => {
  assert.equal(canPatch(old, { text: "x" }, now), false);
});
test("locked PATCH color rejected", () => {
  assert.equal(canPatch(old, { color: "blue" }, now), false);
});
test("unlocked PATCH anything allowed", () => {
  assert.equal(canPatch({ createdAt: now - 59 * MIN, completed: true }, { text: "x", completed: false }, now), true);
});
