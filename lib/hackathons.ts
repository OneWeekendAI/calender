// Hackathons calendar logic. Separate from the notes store. No relative imports so node --test can load it.
export const STORAGE_KEY = "meetcal.hackathons.v1";
export const STATUSES = ["none", "interested", "registered", "submitted", "skipped"] as const;
export type Status = (typeof STATUSES)[number];
export type StudentsMode = "include" | "exclude" | "only";

export type ExtraLink = { label: string; url: string };
export type Hackathon = {
  id: string;
  name: string;
  theme: string;
  tags: string[];
  mode: string;
  start: string | null;
  deadline: string | null;
  india: string;
  studentsOnly: boolean;
  link: string;
  source: string;
  dateNote: string;
  status: Status;
  notes: string;
  extraLinks: ExtraLink[];
  modeNote?: string;
};

export type Filters = {
  search: string;
  tags: string[];
  modes: string[];
  india: string[];
  students: StudentsMode;
  status: string[];
  from: string;
  to: string;
  hidePast: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  search: "", tags: [], modes: [], india: [], students: "include", status: [], from: "", to: "", hidePast: true,
};

export type SortKey = "name" | "theme" | "mode" | "start" | "deadline" | "daysLeft" | "india" | "status";

const p2 = (n: number) => String(n).padStart(2, "0");
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const dayNum = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

// Whole days from today to the deadline (negative once past); null when undated.
export function daysLeft(h: Pick<Hackathon, "deadline">, today: string): number | null {
  return h.deadline ? dayNum(h.deadline) - dayNum(today) : null;
}
export const isUrgent = (h: Pick<Hackathon, "deadline">, today: string) => {
  const n = daysLeft(h, today);
  return n !== null && n >= 0 && n <= 3;
};

export function allTags(list: Hackathon[]): string[] {
  return [...new Set(list.flatMap((h) => h.tags))].sort();
}

export function filterHackathons(list: Hackathon[], f: Filters, today: string): Hackathon[] {
  const q = f.search.trim().toLowerCase();
  return list.filter((h) => {
    if (q && !`${h.name}\n${h.theme}\n${h.notes}`.toLowerCase().includes(q)) return false;
    if (f.tags.length && !f.tags.some((t) => h.tags.includes(t))) return false;
    if (f.modes.length && !f.modes.includes(h.mode)) return false;
    if (f.india.length && !f.india.includes(h.india)) return false;
    if (f.students === "exclude" && h.studentsOnly) return false;
    if (f.students === "only" && !h.studentsOnly) return false;
    if (f.status.length && !f.status.includes(h.status)) return false;
    if (f.from && (!h.deadline || h.deadline < f.from)) return false;
    if (f.to && (!h.deadline || h.deadline > f.to)) return false;
    if (f.hidePast && h.deadline && h.deadline < today) return false;
    return true;
  });
}

// Stable sort; undated rows always go last regardless of direction.
export function sortHackathons(list: Hackathon[], key: SortKey, dir: "asc" | "desc", today: string): Hackathon[] {
  const val = (h: Hackathon): string | number | null => {
    if (key === "daysLeft") return daysLeft(h, today);
    if (key === "start" || key === "deadline") return h[key];
    if (key === "status") return STATUSES.indexOf(h.status);
    return h[key].toLowerCase();
  };
  const sign = dir === "asc" ? 1 : -1;
  return list
    .map((h, i) => ({ h, i, v: val(h) }))
    .sort((a, b) => {
      if (a.v === null || b.v === null) return a.v === b.v ? a.i - b.i : a.v === null ? 1 : -1;
      if (a.v < b.v) return -sign;
      if (a.v > b.v) return sign;
      return a.i - b.i;
    })
    .map((x) => x.h);
}

export function normalize(raw: Partial<Hackathon> & { id: string }): Hackathon {
  const status = STATUSES.includes(raw.status as Status) ? (raw.status as Status) : "none";
  return {
    id: raw.id,
    name: raw.name ?? "",
    theme: raw.theme ?? "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    mode: raw.mode ?? "Online",
    start: raw.start || null,
    deadline: raw.deadline || null,
    india: raw.india ?? "likely",
    studentsOnly: !!raw.studentsOnly,
    link: raw.link ?? "",
    source: raw.source ?? "",
    dateNote: raw.dateNote ?? "",
    status,
    notes: raw.notes ?? "",
    extraLinks: Array.isArray(raw.extraLinks) ? raw.extraLinks : [],
    ...(raw.modeNote ? { modeNote: raw.modeNote } : {}),
  };
}

// The stored list is the full list (saved on first edit), so it wins over the seed:
// edits, additions and deletions all survive. Without a valid stored list the seed is used.
export function mergeWithSeed(seed: Hackathon[], stored: unknown): Hackathon[] {
  if (!Array.isArray(stored)) return seed.map(normalize);
  return stored
    .filter((x): x is Hackathon => !!x && typeof x === "object" && typeof (x as Hackathon).id === "string")
    .map(normalize);
}

export const splitTags = (theme: string) =>
  theme.split(/[,/&]/).map((t) => t.trim().toLowerCase()).filter(Boolean);

export function newHackathon(existing: Hackathon[]): Hackathon {
  let id = `custom-${Date.now().toString(36)}`;
  while (existing.some((h) => h.id === id)) id += "x";
  return normalize({ id, name: "" });
}

// Pure list operations.
export const addItem = (list: Hackathon[], h: Hackathon): Hackathon[] => [...list, h];
export const updateItem = (list: Hackathon[], h: Hackathon): Hackathon[] => list.map((x) => (x.id === h.id ? h : x));
export const deleteItem = (list: Hackathon[], id: string): Hackathon[] => list.filter((x) => x.id !== id);

// localStorage wrappers (browser and Tauri webview). Safe to call during SSR.
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const store = (): Store | null => {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
};

export function loadHackathons(seed: Hackathon[], s: Store | null = store()): Hackathon[] {
  let stored: unknown = null;
  try { const raw = s?.getItem(STORAGE_KEY); if (raw) stored = JSON.parse(raw); } catch { /* corrupt: fall back to seed */ }
  return mergeWithSeed(seed, stored);
}
export function saveHackathons(list: Hackathon[], s: Store | null = store()): void {
  try { s?.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* quota or private mode */ }
}
export function resetHackathons(seed: Hackathon[], s: Store | null = store()): Hackathon[] {
  try { s?.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  return seed.map(normalize);
}
// The UI must confirm() before calling resetHackathons.

export function exportHackathons(list: Hackathon[]): void {
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hackathons-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
