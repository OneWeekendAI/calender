"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ThemePicker } from "../ThemePicker";
import seedJson from "../../lib/hackathons-seed.json";
import {
  DEFAULT_FILTERS, STATUSES, addItem, allTags, daysLeft, deleteItem, exportHackathons, filterHackathons,
  isUrgent, loadHackathons, mergeWithSeed, newHackathon, resetHackathons, saveHackathons, sortHackathons,
  splitTags, todayStr, updateItem, type Filters, type Hackathon, type SortKey, type StudentsMode,
} from "../../lib/hackathons";

const SEED = mergeWithSeed(seedJson as unknown as Hackathon[], null);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const p2 = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${p2(m + 1)}-${p2(d)}`;

const COLUMNS: [SortKey, string][] = [
  ["name", "Name"], ["theme", "Theme"], ["mode", "Mode"], ["start", "Start"], ["deadline", "Deadline"],
  ["daysLeft", "Days left"], ["india", "India"], ["status", "Status"],
];

export default function HackathonsPage() {
  const [list, setList] = useState<Hackathon[]>(SEED);
  const [today, setToday] = useState("2026-01-01");
  const [view, setView] = useState<"month" | "list">("month");
  const [cursor, setCursor] = useState({ y: 2026, m: 0 });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "deadline", dir: "asc" });
  const [editing, setEditing] = useState<{ h: Hackathon; isNew: boolean } | null>(null);

  useEffect(() => {
    const t = todayStr();
    setToday(t);
    setCursor({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
    setList(loadHackathons(SEED));
  }, []);

  const commit = (next: Hackathon[]) => { setList(next); saveHackathons(next); };
  const tags = useMemo(() => allTags(list), [list]);
  const shown = useMemo(() => filterHackathons(list, filters, today), [list, filters, today]);
  const sorted = useMemo(() => sortHackathons(shown, sort.key, sort.dir, today), [shown, sort, today]);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const toggle = (k: "tags" | "modes" | "india" | "status", v: string) =>
    setFilters((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  const shiftMonth = (n: number) =>
    setCursor((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const goToday = () => setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 });
  const title = new Date(cursor.y, cursor.m, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(cursor.y, cursor.m, 1 - first.getDay() + i);
      return { date: ymd(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), other: d.getMonth() !== cursor.m };
    });
  }, [cursor]);
  const byDate = useMemo(() => {
    const m = new Map<string, { h: Hackathon; kind: "deadline" | "start" }[]>();
    const push = (k: string, h: Hackathon, kind: "deadline" | "start") => m.set(k, [...(m.get(k) ?? []), { h, kind }]);
    for (const h of shown) {
      if (h.deadline) push(h.deadline, h, "deadline");
      if (h.start) push(h.start, h, "start");
    }
    return m;
  }, [shown]);
  const undated = shown.filter((h) => !h.deadline && !h.start);

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const open = (h: Hackathon) => setEditing({ h, isNew: false });
  const reset = () => {
    if (window.confirm("Reset to the original list? All your edits, additions and notes will be lost.")) {
      setList(resetHackathons(SEED));
    }
  };

  const Chip = ({ h, kind }: { h: Hackathon; kind: "deadline" | "start" }) => (
    <button className={`hk-chip st-${h.status} ${kind}`} onClick={() => open(h)} title={`${h.name} (${kind === "start" ? "starts" : "deadline"})`}>
      {kind === "deadline" && isUrgent(h, today) && <span className="hk-reddot" aria-label="Deadline within 3 days" />}
      {kind === "start" && <span className="hk-sm">starts </span>}
      {h.name}
    </button>
  );

  return (
    <main className="cal hk">
      <header className="bar">
        <div className="bar-left">
          <Link href="/" className="hk-link">&lsaquo; Notes</Link>
          <h1>{view === "month" ? title : "Hackathons"}</h1>
        </div>
        <div>
          <ThemePicker />
          {view === "month" && (
            <>
              <button onClick={() => shiftMonth(-1)} aria-label="Previous month">&lsaquo;</button>
              <button onClick={goToday} className="hk-txtbtn">Today</button>
              <button onClick={() => shiftMonth(1)} aria-label="Next month">&rsaquo;</button>
            </>
          )}
          <button className="hk-txtbtn" onClick={() => setView(view === "month" ? "list" : "month")}>
            {view === "month" ? "List" : "Month"}
          </button>
          <button className="hk-txtbtn" onClick={() => setEditing({ h: newHackathon(list), isNew: true })}>+ Add</button>
        </div>
      </header>

      <div className="hk-body">
        <aside className="hk-filters">
          <input type="search" placeholder="Search name, theme, notes" value={filters.search} onChange={(e) => set("search", e.target.value)} />
          <label className="hk-check"><input type="checkbox" checked={filters.hidePast} onChange={(e) => set("hidePast", e.target.checked)} /> Hide past deadlines</label>
          <fieldset><legend>Mode</legend>
            {["Online", "Hybrid"].map((m) => (
              <label key={m} className="hk-check"><input type="checkbox" checked={filters.modes.includes(m)} onChange={() => toggle("modes", m)} /> {m}</label>
            ))}
          </fieldset>
          <fieldset><legend>India</legend>
            {["verified", "likely"].map((m) => (
              <label key={m} className="hk-check"><input type="checkbox" checked={filters.india.includes(m)} onChange={() => toggle("india", m)} /> {m}</label>
            ))}
          </fieldset>
          <label>Students-only
            <select value={filters.students} onChange={(e) => set("students", e.target.value as StudentsMode)}>
              <option value="include">Include</option><option value="exclude">Exclude</option><option value="only">Only</option>
            </select>
          </label>
          <fieldset><legend>Status</legend>
            {STATUSES.map((s) => (
              <label key={s} className="hk-check"><input type="checkbox" checked={filters.status.includes(s)} onChange={() => toggle("status", s)} /> {s}</label>
            ))}
          </fieldset>
          <fieldset><legend>Deadline range</legend>
            <label>From <input type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} /></label>
            <label>To <input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} /></label>
          </fieldset>
          <fieldset className="hk-tags"><legend>Themes</legend>
            <div className="hk-tagbox">
              {tags.map((t) => (
                <button key={t} className={`hk-tag${filters.tags.includes(t) ? " on" : ""}`} onClick={() => toggle("tags", t)} aria-pressed={filters.tags.includes(t)}>{t}</button>
              ))}
            </div>
          </fieldset>
          <button className="hk-btn" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</button>
          <p className="hk-count" aria-live="polite">{shown.length} of {list.length} shown</p>
          <div className="hk-data">
            <button className="hk-btn" onClick={() => exportHackathons(list)}>Export JSON</button>
            <button className="hk-btn" onClick={reset}>Reset to seed</button>
          </div>
        </aside>

        <section className="hk-main">
          {view === "month" ? (
            <>
              <div className="grid heads">{WEEKDAYS.map((w) => <div key={w}>{w}</div>)}</div>
              <div className="grid days hk-days">
                {cells.map((c) => (
                  <div key={c.date} className={`cell hk-cell${c.other ? " other" : ""}`}>
                    <span className={`num${c.date === today ? " today" : ""}`}>{c.day}</span>
                    <div className="hk-chips">
                      {(byDate.get(c.date) ?? []).map((e) => <Chip key={`${e.h.id}-${e.kind}`} h={e.h} kind={e.kind} />)}
                    </div>
                  </div>
                ))}
              </div>
              {undated.length > 0 && (
                <div className="hk-undated">
                  <strong>Undated</strong>
                  {undated.map((h) => <Chip key={h.id} h={h} kind="deadline" />)}
                </div>
              )}
            </>
          ) : (
            <div className="hk-tablewrap">
              <table className="hk-table">
                <thead>
                  <tr>
                    {COLUMNS.map(([k, label]) => (
                      <th key={k} aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                        <button onClick={() => onSort(k)}>{label}{sort.key === k ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}</button>
                      </th>
                    ))}
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((h) => {
                    const n = daysLeft(h, today);
                    return (
                      <tr key={h.id} onClick={() => open(h)} className={`st-${h.status}`}>
                        <td>{isUrgent(h, today) && <span className="hk-reddot" />}{h.name}{h.studentsOnly ? " (S)" : ""}</td>
                        <td>{h.theme}</td>
                        <td>{h.mode}</td>
                        <td>{h.start ?? "-"}</td>
                        <td>{h.deadline ?? "-"}</td>
                        <td>{n === null ? "-" : n < 0 ? `${-n}d ago` : `${n}d`}</td>
                        <td>{h.india}</td>
                        <td>{h.status}</td>
                        <td>{h.link && <a href={h.link} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>open</a>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sorted.length === 0 && <p className="hk-empty">Nothing matches the filters.</p>}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <Detail
          key={editing.h.id}
          initial={editing.h}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={(h) => { commit(editing.isNew ? addItem(list, h) : updateItem(list, h)); setEditing(null); }}
          onDelete={() => {
            if (window.confirm(`Delete "${editing.h.name || "this hackathon"}"?`)) { commit(deleteItem(list, editing.h.id)); setEditing(null); }
          }}
        />
      )}
    </main>
  );
}

function Detail({ initial, isNew, onClose, onSave, onDelete }: {
  initial: Hackathon; isNew: boolean; onClose: () => void; onSave: (h: Hackathon) => void; onDelete: () => void;
}) {
  const [h, setH] = useState(initial);
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const up = <K extends keyof Hackathon>(k: K, v: Hackathon[K]) => setH((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const setLink = (i: number, patch: Partial<{ label: string; url: string }>) =>
    up("extraLinks", h.extraLinks.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const save = () => onSave({ ...h, name: h.name.trim() || "Untitled", tags: tagText.trim() ? splitTags(tagText) : [] });

  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hk-modal" role="dialog" aria-modal="true" aria-label={isNew ? "Add hackathon" : "Edit hackathon"}>
        <h2 className="mtitle">{isNew ? "Add hackathon" : "Hackathon"}</h2>
        <div className="hk-form">
          <label className="wide">Name<input value={h.name} onChange={(e) => up("name", e.target.value)} autoFocus /></label>
          <label>Theme<input value={h.theme} onChange={(e) => up("theme", e.target.value)} /></label>
          <label>Tags (comma separated)<input value={tagText} onChange={(e) => setTagText(e.target.value)} /></label>
          <label>Mode
            <select value={h.mode} onChange={(e) => up("mode", e.target.value)}>
              {["Online", "Hybrid", ...(["Online", "Hybrid"].includes(h.mode) ? [] : [h.mode])].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label>India
            <select value={h.india} onChange={(e) => up("india", e.target.value)}>
              {["verified", "likely", ...(["verified", "likely"].includes(h.india) ? [] : [h.india])].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label>Start<input type="date" value={h.start ?? ""} onChange={(e) => up("start", e.target.value || null)} /></label>
          <label>Deadline<input type="date" value={h.deadline ?? ""} onChange={(e) => up("deadline", e.target.value || null)} /></label>
          <label>Status
            <select value={h.status} onChange={(e) => up("status", e.target.value as Hackathon["status"])}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="hk-check"><input type="checkbox" checked={h.studentsOnly} onChange={(e) => up("studentsOnly", e.target.checked)} /> Students only</label>
          <label className="wide">Link<input value={h.link} onChange={(e) => up("link", e.target.value)} /></label>
          <label>Source<input value={h.source} onChange={(e) => up("source", e.target.value)} /></label>
          <label>Date note<input value={h.dateNote} onChange={(e) => up("dateNote", e.target.value)} /></label>
          <label className="wide">Notes<textarea rows={4} value={h.notes} onChange={(e) => up("notes", e.target.value)} /></label>
          <div className="wide hk-links">
            <span>Extra links</span>
            {h.extraLinks.map((l, i) => (
              <div key={i} className="hk-linkrow">
                <input placeholder="Label" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
                <input placeholder="https://" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
                {l.url && <a href={l.url} target="_blank" rel="noopener">open</a>}
                <button className="hk-btn" onClick={() => up("extraLinks", h.extraLinks.filter((_, j) => j !== i))} aria-label="Remove link">&times;</button>
              </div>
            ))}
            <button className="hk-btn" onClick={() => up("extraLinks", [...h.extraLinks, { label: "", url: "" }])}>+ Add link</button>
          </div>
          {h.link && <p className="wide"><a href={h.link} target="_blank" rel="noopener">Open hackathon page</a></p>}
        </div>
        <div className="hk-foot">
          {!isNew && <button className="hk-btn danger" onClick={onDelete}>Delete</button>}
          <button className="hk-btn push" onClick={onClose}>Cancel</button>
          <button className="hk-btn primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
