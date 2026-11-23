"use client";

import { useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Page() {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const first = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const lead = first.getDay();
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = i - lead + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });
  const isToday = (d: number) =>
    d === now.getDate() && view.m === now.getMonth() && view.y === now.getFullYear();
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
        {cells.map((d, i) => (
          <div key={i} className={d === null ? "cell empty" : "cell"}>
            {d !== null && <span className={isToday(d) ? "num today" : "num"}>{d}</span>}
          </div>
        ))}
      </div>
    </main>
  );
}
