"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [text, setText] = useState("");
  const [color, setColor] = useState<Color>("yellow");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const step = (n: number) => {
    const d = parse(day);
    d.setDate(d.getDate() + n);
    go(fromDate(d));
  };
  const title = parse(day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const add = async () => {
    if (!text.trim()) return;
    await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date: day, text, color }) });
    setText("");
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
          <button onClick={() => step(-1)} aria-label="Previous day">&lsaquo;</button>
          <button onClick={() => step(1)} aria-label="Next day">&rsaquo;</button>
        </div>
      </header>
      {error && <p className="err">{error}</p>}
      <div className="board">
        {notes.map((n, i) => (
          <Sticky key={n.id} n={n} i={i} today={today} patch={patch} del={del} comment={comment} />
        ))}
        {adding ? (
          <div className={`sticky editor c-${color}`}>
            <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={"- bullet one\n- bullet two"} rows={6} />
            <div className="swatches">
              {COLORS.map((c) => (
                <button key={c} aria-label={c} className={"swatch" + (c === color ? " sel" : "")} style={{ background: `var(--${c})` }} onClick={() => setColor(c)} />
              ))}
            </div>
            <div className="row">
              <button onClick={add}>Save</button>
              <button onClick={() => { setAdding(false); setText(""); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="add" onClick={() => setAdding(true)}>+ Add note</button>
        )}
      </div>
    </main>
  );
}

function Sticky({ n, i, today, patch, del, comment }: { n: Note; i: number; today: string; patch: (id: string, b: object) => Promise<void>; del: (id: string) => Promise<void>; comment: (id: string, t: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(n.text);
  const od = isOverdue(n, today);
  const locked = isLocked(n);
  const [cm, setCm] = useState("");
  const rot = (((i * 37) % 7) - 3) * 0.8;
  const tape = (((i * 5) % 5) - 2) * 1.5;
  return (
    <div
      className={`sticky c-${n.color}` + (n.completed ? " completed" : "") + (od ? " overdue" : "")}
      style={{ "--rot": `${rot}deg`, "--tape": `${tape}deg` } as React.CSSProperties}
    >
      {locked && <LockIcon />}
      {od && <span className="od-badge">OVERDUE</span>}
      {editing ? (
        <>
          <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={6} />
          <div className="row">
            <button onClick={async () => { await patch(n.id, { text: val }); setEditing(false); }}>Save</button>
            <button onClick={() => { setVal(n.text); setEditing(false); }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="txt">{n.text}</p>
          {(n.comments ?? []).length > 0 && (
            <ul className="comments">
              {n.comments.map((c) => (
                <li key={c.id}>{c.text}</li>
              ))}
            </ul>
          )}
          {locked ? (
            <div className="row">
              {n.completed ? <span className="done-tag">Done</span> : <label><input type="checkbox" checked={false} onChange={() => patch(n.id, { completed: true })} /> Done</label>}
              <input className="cm" value={cm} onChange={(e) => setCm(e.target.value)} placeholder="Add comment" />
              <button onClick={async () => { if (cm.trim()) { await comment(n.id, cm); setCm(""); } }}>Comment</button>
            </div>
          ) : (
            <div className="row">
              <label><input type="checkbox" checked={n.completed} onChange={(e) => patch(n.id, { completed: e.target.checked })} /> Done</label>
              <button onClick={() => setEditing(true)}>Edit</button>
              <button onClick={() => del(n.id)}>Delete</button>
            </div>
          )}
        </>
      )}
    </div>
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
