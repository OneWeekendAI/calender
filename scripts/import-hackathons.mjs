// Parses the hackathons markdown table into lib/hackathons-seed.json. Plain Node, no dependencies.
// Usage: node scripts/import-hackathons.mjs [input.md] [output.json]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const DEFAULT_IN = "/Users/ritwiksingh/Desktop/extra/hackathons.md";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Parse the first "Mon D, YYYY" in raw. note is the raw text when it held anything beyond that date.
export function parseDate(raw) {
  const text = String(raw ?? "").trim();
  const m = /\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})\b/.exec(text);
  let date = null;
  if (m) {
    const mi = MONTHS.indexOf(m[1].toLowerCase());
    const d = Number(m[2]);
    const y = Number(m[3]);
    if (mi >= 0 && d >= 1 && d <= new Date(y, mi + 1, 0).getDate()) {
      date = `${y}-${String(mi + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  const clean = date && m && m[0] === text;
  return { date, note: clean || !text ? "" : text };
}

export const slugify = (s) =>
  String(s).toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const splitTags = (theme) =>
  String(theme).split(/[,/&]/).map((t) => t.trim().toLowerCase()).filter(Boolean);

function cells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

// Columns: Name | Platform | Theme | Mode | Start | Deadline | Prize | India | Link | Source. Platform and Prize are dropped.
export function parseRow(line) {
  const c = cells(line);
  if (c.length < 10) return null;
  const [name, , theme, modeRaw, startRaw, deadRaw, , indiaRaw, link, source] = c;
  const start = parseDate(startRaw);
  const deadline = parseDate(deadRaw);
  const notes = [];
  if (start.note) notes.push(`start: ${start.note}`);
  if (deadline.note) notes.push(`deadline: ${deadline.note}`);
  const modeWord = (/^[A-Za-z]+/.exec(modeRaw) || [""])[0].toLowerCase();
  const mode = modeWord ? modeWord[0].toUpperCase() + modeWord.slice(1) : modeRaw;
  const indiaWord = (/^[A-Za-z]+/.exec(indiaRaw) || [""])[0].toLowerCase();
  const studentsOnly = /[(\s,]S[,)]/.test(name) || /student/i.test(line);
  const rec = {
    id: slugify(name),
    name,
    theme,
    tags: splitTags(theme),
    mode,
    start: start.date,
    deadline: deadline.date,
    india: indiaWord || "unknown",
    studentsOnly,
    link,
    source,
    dateNote: notes.join("; "),
    status: "none",
    notes: "",
    extraLinks: [],
  };
  if (modeRaw !== mode) rec.modeNote = modeRaw;
  return rec;
}

export function parseTable(md) {
  const out = [];
  const seen = new Set();
  let inTable = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^##\s+Excluded/i.test(line)) break;
    if (!line.startsWith("|")) { if (inTable) inTable = false; continue; }
    if (/^\|\s*Name\s*\|/i.test(line)) { inTable = true; continue; }
    if (!inTable || /^\|\s*-/.test(line)) continue;
    const rec = parseRow(line);
    if (!rec) continue;
    let id = rec.id, n = 2;
    while (seen.has(id)) id = `${rec.id}-${n++}`;
    seen.add(id);
    out.push({ ...rec, id });
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const here = dirname(fileURLToPath(import.meta.url));
  const input = process.argv[2] || DEFAULT_IN;
  const output = process.argv[3] || resolve(here, "../lib/hackathons-seed.json");
  const list = parseTable(readFileSync(input, "utf8"));
  writeFileSync(output, JSON.stringify(list, null, 2) + "\n");
  console.log(`wrote ${list.length} records to ${output}`);
}
