import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDate, parseRow, parseTable } from "../scripts/import-hackathons.mjs";
import {
  DEFAULT_FILTERS, filterHackathons, mergeWithSeed, sortHackathons, daysLeft, normalize,
  loadHackathons, saveHackathons, resetHackathons, STORAGE_KEY,
} from "../lib/hackathons.ts";

test("parseDate: plain date", () => {
  assert.deepEqual(parseDate("Nov 30, 2026"), { date: "2026-11-30", note: "" });
});
test("parseDate: suffix kept as note", () => {
  assert.deepEqual(parseDate("Dec 19, 2026 (reg. open)"), { date: "2026-12-19", note: "Dec 19, 2026 (reg. open)" });
  assert.equal(parseDate("~Dec 1, 2026").date, "2026-12-01");
  assert.equal(parseDate("~Dec 1, 2026").note, "~Dec 1, 2026");
});
test("parseDate: garbage is null", () => {
  assert.equal(parseDate("Ongoing").date, null);
  assert.equal(parseDate("~Jul 2027").date, null);
  assert.equal(parseDate("Feb 31, 2026").date, null);
  assert.equal(parseDate("").date, null);
});
test("parseRow drops prize and platform, builds record", () => {
  const r = parseRow("| Foo Hack (S) | Devpost / X | AI, web & ML | Hybrid (x) | Nov 1, 2026 | Dec 2, 2026 (approx.) | $999 | Verified (ok) | https://f.io/ | Devpost |");
  assert.equal(r.id, "foo-hack-s");
  assert.deepEqual(r.tags, ["ai", "web", "ml"]);
  assert.equal(r.mode, "Hybrid");
  assert.equal(r.india, "verified");
  assert.equal(r.studentsOnly, true);
  assert.equal(r.deadline, "2026-12-02");
  assert.match(r.dateNote, /approx/);
  assert.equal(JSON.stringify(r).includes("999"), false);
  assert.equal("prize" in r, false);
  assert.equal("platform" in r, false);
});
test("parseTable ignores excluded section; seed has 70", () => {
  const md = "| Name | P | T | M | S | D | Pz | I | L | Src |\n|---|---|---|---|---|---|---|---|---|---|\n| A | p | t | Online | x | y | z | Likely | l | s |\n\n## Excluded / uncertain\n| B | p | t | Online | x | y | z | Likely | l | s |\n";
  assert.deepEqual(parseTable(md).map((r) => r.id), ["a"]);
  assert.equal(JSON.parse(readFileSync(new URL("../lib/hackathons-seed.json", import.meta.url), "utf8")).length, 70);
});

const mk = (o) => normalize({ id: o.name.toLowerCase(), ...o });
const L = [
  mk({ name: "Alpha", theme: "AI", tags: ["ai"], mode: "Online", india: "verified", deadline: "2026-12-01", status: "interested", notes: "bring laptop" }),
  mk({ name: "Beta", theme: "Web3", tags: ["web3", "ai"], mode: "Hybrid", india: "likely", deadline: "2026-11-01", studentsOnly: true }),
  mk({ name: "Gamma", theme: "Games", tags: ["games"], mode: "Online", india: "likely", deadline: null }),
  mk({ name: "Delta", theme: "Health", tags: ["health"], mode: "Online", india: "verified", deadline: "2027-01-10", studentsOnly: true, status: "registered" }),
];
const F = (o) => ({ ...DEFAULT_FILTERS, hidePast: false, ...o });
const names = (l) => l.map((h) => h.name);
const T = "2026-11-27";

test("filter: search across name, theme, notes", () => {
  assert.deepEqual(names(filterHackathons(L, F({ search: "alp" }), T)), ["Alpha"]);
  assert.deepEqual(names(filterHackathons(L, F({ search: "WEB3" }), T)), ["Beta"]);
  assert.deepEqual(names(filterHackathons(L, F({ search: "laptop" }), T)), ["Alpha"]);
});
test("filter: tags any-of, mode, india", () => {
  assert.deepEqual(names(filterHackathons(L, F({ tags: ["ai"] }), T)), ["Alpha", "Beta"]);
  assert.deepEqual(names(filterHackathons(L, F({ modes: ["Hybrid"] }), T)), ["Beta"]);
  assert.deepEqual(names(filterHackathons(L, F({ india: ["verified"] }), T)), ["Alpha", "Delta"]);
});
test("filter: studentsOnly include/exclude/only", () => {
  assert.equal(filterHackathons(L, F({ students: "include" }), T).length, 4);
  assert.deepEqual(names(filterHackathons(L, F({ students: "exclude" }), T)), ["Alpha", "Gamma"]);
  assert.deepEqual(names(filterHackathons(L, F({ students: "only" }), T)), ["Beta", "Delta"]);
});
test("filter: status, date range, hidePast", () => {
  assert.deepEqual(names(filterHackathons(L, F({ status: ["registered", "interested"] }), T)), ["Alpha", "Delta"]);
  assert.deepEqual(names(filterHackathons(L, F({ from: "2026-11-15", to: "2026-12-31" }), T)), ["Alpha"]);
  assert.deepEqual(names(filterHackathons(L, F({ hidePast: true }), T)), ["Alpha", "Gamma", "Delta"]);
  assert.deepEqual(names(filterHackathons(L, F({ hidePast: true }), "2026-12-01")), ["Alpha", "Gamma", "Delta"]);
  assert.deepEqual(names(filterHackathons(L, F({ hidePast: true }), "2026-12-02")), ["Gamma", "Delta"]);
});
test("sort by deadline keeps undated last; daysLeft", () => {
  assert.deepEqual(names(sortHackathons(L, "deadline", "asc", T)), ["Beta", "Alpha", "Delta", "Gamma"]);
  assert.deepEqual(names(sortHackathons(L, "deadline", "desc", T)), ["Delta", "Alpha", "Beta", "Gamma"]);
  assert.equal(daysLeft(L[0], T), 4);
  assert.equal(daysLeft(L[1], T), -26);
  assert.equal(daysLeft(L[2], T), null);
});

test("merge: stored list keeps user edits, additions and deletions", () => {
  const seed = L;
  const edited = [{ ...seed[0], status: "submitted", notes: "mine" }, seed[3], mk({ name: "Custom" })];
  const merged = mergeWithSeed(seed, edited);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].status, "submitted");
  assert.equal(merged[0].notes, "mine");
  assert.equal(merged.some((h) => h.name === "Beta"), false);
  assert.equal(mergeWithSeed(seed, null).length, 4);
  assert.equal(mergeWithSeed(seed, "junk").length, 4);
});
test("load/save/reset via storage", () => {
  const m = new Map();
  const s = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  assert.equal(loadHackathons(L, s).length, 4);
  saveHackathons([{ ...L[0], notes: "x" }], s);
  assert.equal(m.has(STORAGE_KEY), true);
  assert.equal(loadHackathons(L, s)[0].notes, "x");
  assert.equal(resetHackathons(L, s).length, 4);
  assert.equal(loadHackathons(L, s).length, 4);
});
