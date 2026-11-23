"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ThemePicker } from "./ThemePicker";
import { COLORS, isLocked, isOverdue, todayStr, type Color, type Note } from "../lib/rules";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const p2 = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${p2(m + 1)}-${p2(d)}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fromDate = (d: Date) => ymd(d.getFullYear(), d.getMonth(), d.getDate());

async function fetchMonth(month: string): Promise<Note[]> {
  const r = await fetch(`/api/notes?month=${month}`, { cache: "no-store" });
  return r.ok ? r.json() : [];
}

export default function Page() {
  const [now] = useState(() => new Date());
  const today = todayStr(now);
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [day, setDay] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const month = day ? day.slice(0, 7) : `${view.y}-${p2(view.m + 1)}`;

  const load = useCallback(async () => setNotes(await fetchMonth(month)), [month]);
  useEffect(() => {
    let live = true;
    fetchMonth(month).then((n) => live && setNotes(n));
    return () => {
      live = false;
    };
  }, [month]);

  if (day) return <DayView day={day} today={today} notes={notes.filter((n) => n.date === day)} reload={load} go={setDay} back={() => { setView({ y: parse(day).getFullYear(), m: parse(day).getMonth() }); setDay(null); }} />;

  const first = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const lead = first.getDay();
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = i - lead + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });
  const shift = (n: number) => {
    const d = new Date(view.y, view.m + n, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const title = first.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <main className="cal">
      <header className="bar">
        <h1>{title}</h1>
        <div>
          <ThemePicker />
          <button onClick={() => shift(-1)} aria-label="Previous month">&lsaquo;</button>
          <button onClick={() => shift(1)} aria-label="Next month">&rsaquo;</button>
        </div>
      </header>
      <div className="grid heads">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid days" style={{ gridTemplateRows: `repeat(${weeks}, 1fr)` }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="cell empty" />;
          const ds = ymd(view.y, view.m, d);
          const dn = notes.filter((n) => n.date === ds);
          const overdue = dn.some((n) => isOverdue(n, today));
          return (
            <div
              key={i}
              className={"cell clickable" + (overdue ? " has-overdue" : "")}
              onClick={() => setDay(ds)}
              role="button"
              aria-label={`Open ${ds}`}
            >
              <span className={ds === today ? "num today" : "num"}>{d}</span>
              {overdue && <span className="od-mark">!</span>}
              <div className="dots">
                {dn.slice(0, 12).map((n) => (
                  <span key={n.id} className={`dot c-${n.color}` + (n.completed ? " done" : "") + (isOverdue(n, today) ? " od" : "")} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function DayView(props: {
  day: string;
  today: string;
  notes: Note[];
  reload: () => Promise<void>;
  go: (d: string) => void;
  back: () => void;
}) {
  const { day, today, notes, reload, go, back } = props;
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = notes.find((n) => n.id === openId) ?? null;
  const [error, setError] = useState("");
  const step = (n: number) => {
    const d = parse(day);
    d.setDate(d.getDate() + n);
    go(fromDate(d));
  };
  const title = parse(day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const add = async (text: string, color: Color) => {
    await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date: day, text, color }) });
    setAdding(false);
    await reload();
  };
  const patch = async (id: string, body: object) => {
    await fetch("/api/notes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ month: day.slice(0, 7), id, ...body }) });
    await reload();
  };
  const comment = async (id: string, t: string) => {
    await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ month: day.slice(0, 7), id, comment: t }) });
    await reload();
  };
  const del = async (id: string) => {
    const r = await fetch(`/api/notes?month=${day.slice(0, 7)}&id=${id}`, { method: "DELETE" });
    setError(r.ok ? "" : (await r.json()).error);
    await reload();
  };

  return (
    <main className="cal">
      <header className="bar">
        <div className="bar-left">
          <button onClick={back} className="back">&lsaquo; Month</button>
          <h1>{title}</h1>
        </div>
        <div>
          <ThemePicker />
          <button onClick={() => step(-1)} aria-label="Previous day">&lsaquo;</button>
          <button onClick={() => step(1)} aria-label="Next day">&rsaquo;</button>
        </div>
      </header>
      {error && <p className="err">{error}</p>}
      <div className="board">
        {notes.map((n, i) => (
          <Compact key={n.id} n={n} i={i} today={today} open={() => setOpenId(n.id)} patch={patch} />
        ))}
        <button className="add" onClick={() => setAdding(true)}>+ Add note</button>
      </div>
      {adding && <Editor title="New note" initial="" initialColor="yellow" onCancel={() => setAdding(false)} onSave={add} />}
      {opened && <Expanded n={opened} today={today} close={() => setOpenId(null)} patch={patch} del={async (id) => { await del(id); setOpenId(null); }} comment={comment} />}
    </main>
  );
}

// Enter on a "- " line continues the bullet; Enter on an empty bullet ends the list.
function bulletEnter(e: React.KeyboardEvent<HTMLTextAreaElement>, set: (v: string) => void, caretRef: { current: number | null }) {
  if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.nativeEvent.isComposing) return;
  const el = e.currentTarget;
  const { selectionStart: s, selectionEnd: en, value } = el;
  const ls = value.lastIndexOf("\n", s - 1) + 1;
  const line = value.slice(ls, s);
  if (!line.startsWith("- ")) return;
  e.preventDefault();
  let next: string, caret: number;
  if (line === "- ") {
    next = value.slice(0, ls) + value.slice(en);
    caret = ls;
  } else {
    next = value.slice(0, s) + "\n- " + value.slice(en);
    caret = s + 3;
  }
  set(next);
  caretRef.current = caret;
}

function Modal({ children, onClose, label, className = "" }: { children: React.ReactNode; onClose: () => void; label: string; className?: string }) {
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`sticky modal ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

function Editor({ title, initial, initialColor, onSave, onCancel, hideColor }: { title: string; initial: string; initialColor: Color; onSave: (text: string, color: Color) => Promise<void>; onCancel: () => void; hideColor?: boolean }) {
  const [text, setText] = useState(initial);
  const [color, setColor] = useState<Color>(initialColor);
  const [busy, setBusy] = useState(false);
  const caretRef = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (caretRef.current !== null && taRef.current) taRef.current.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  }, [text]);
  const can = text.trim().length > 0 && !busy;
  const save = async () => {
    if (!can) return;
    setBusy(true);
    await onSave(text, color);
  };
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div
        className={`sticky modal editor c-${color}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
        }}
      >
        <h2 className="mtitle">{title}</h2>
        <textarea ref={taRef} autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => bulletEnter(e, setText, caretRef)} placeholder={"Write your note...\n- start a bullet list with a dash"} aria-label="Note text" />
        <div className="mfoot">
          {!hideColor && (
            <div className="swatches" role="radiogroup" aria-label="Color">
              {COLORS.map((c) => (
                <button key={c} role="radio" aria-checked={c === color} aria-label={c} className={"swatch" + (c === color ? " sel" : "")} style={{ background: `var(--${c})` }} onClick={() => setColor(c)} />
              ))}
            </div>
          )}
          <div className="row">
            <span className="hint">Cmd/Ctrl+Enter to save, Esc to cancel</span>
            <button className="primary" onClick={save} disabled={!can}>Save</button>
            <button onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Compact({ n, i, today, open, patch }: { n: Note; i: number; today: string; open: () => void; patch: (id: string, b: object) => Promise<void> }) {
  const od = isOverdue(n, today);
  const locked = isLocked(n);
  const rot = (((i * 37) % 7) - 3) * 0.8;
  const tape = (((i * 5) % 5) - 2) * 1.5;
  const cc = (n.comments ?? []).length;
  return (
    <div
      className={`sticky compact c-${n.color}` + (n.completed ? " completed" : "") + (od ? " overdue" : "")}
      style={{ "--rot": `${rot}deg`, "--tape": `${tape}deg` } as React.CSSProperties}
      role="button"
      tabIndex={0}
      aria-label={`Open note: ${n.text.slice(0, 60)}`}
      onClick={open}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); } }}
    >
      {od && <span className="od-badge">OVERDUE</span>}
      <p className="txt clamp">{n.text}</p>
      <div className="cfoot">
        {od ? <span className="missed" title="Overdue notes can no longer be completed">missed</span> : <button
          className={"tick" + (n.completed ? " on" : "")}
          aria-label={n.completed ? "Done" : "Mark done"}
          aria-pressed={n.completed}
          disabled={n.completed && locked}
          onClick={(e) => { e.stopPropagation(); patch(n.id, { completed: !n.completed }); }}
        >
          {n.completed ? "\u2713" : ""}
        </button>}
        <span className="cm-aff">comment{cc > 0 ? ` (${cc})` : ""}</span>
        {locked && <LockIcon />}
      </div>
    </div>
  );
}

function Expanded({ n, today, close, patch, del, comment }: { n: Note; today: string; close: () => void; patch: (id: string, b: object) => Promise<void>; del: (id: string) => Promise<void>; comment: (id: string, t: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [cm, setCm] = useState("");
  const od = isOverdue(n, today);
  const locked = isLocked(n);
  useEffect(() => {
    if (editing) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [editing, close]);
  if (editing) return <Editor title="Edit note" initial={n.text} initialColor={n.color} onCancel={() => setEditing(false)} onSave={async (t, c) => { await patch(n.id, c !== n.color ? { text: t, color: c } : { text: t }); setEditing(false); }} />;
  const send = async () => { if (cm.trim()) { await comment(n.id, cm); setCm(""); } };
  return (
    <Modal onClose={close} label="Note" className={`c-${n.color}` + (n.completed ? " completed" : "") + (od ? " od-modal" : "")}>
      {locked && <LockIcon />}
      {od && <span className="od-badge">OVERDUE</span>}
      <p className="txt full">{n.text}</p>
      {(n.comments ?? []).length > 0 && (
        <ul className="comments">
          {n.comments.map((c) => (
            <li key={c.id}>{c.text}</li>
          ))}
        </ul>
      )}
      <div className="row cmrow">
        <input className="cm" value={cm} onChange={(e) => setCm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Add comment" aria-label="Add comment" />
        <button onClick={send} disabled={!cm.trim()}>Comment</button>
      </div>
      <div className="row mfoot">
        {od ? <span className="missed">missed</span> : n.completed && locked ? <span className="done-tag">Done &#10003;</span> : (
          <label><input type="checkbox" checked={n.completed} onChange={(e) => patch(n.id, { completed: e.target.checked })} /> Done</label>
        )}
        {!locked && <button onClick={() => setEditing(true)}>Edit</button>}
        {!locked && <button onClick={() => del(n.id)}>Delete</button>}
        <button onClick={close} className="push">Close</button>
      </div>
    </Modal>
  );
}

function LockIcon() {
  return (
    <svg className="lock" viewBox="0 0 16 16" role="img" aria-label="Locked" fill="currentColor">
      <title>Locked</title>
      <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2H13v7H3V7h1.5zm1.5 0h4V5a2 2 0 0 0-4 0v2z" />
    </svg>
  );
}
