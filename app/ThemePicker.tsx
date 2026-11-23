"use client";

import { useEffect, useRef, useState } from "react";
import { THEMES, THEME_KEY, byId, type Theme } from "./themes";

export function ThemePicker() {
  const [id, setId] = useState("paper");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(byId(document.documentElement.dataset.theme ?? null).id);
  }, []);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const pick = (t: Theme) => {
    setId(t.id);
    if (t.id === "paper") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t.id;
    try {
      localStorage.setItem(THEME_KEY, t.id);
    } catch {}
  };
  const cur = byId(id);
  const families = [...new Set(THEMES.map((t) => t.family))];
  const prev = (t: Theme): React.CSSProperties => ({ backgroundImage: t.layers, backgroundSize: t.size.replace(/min\([^)]*\)/g, "260px"), backgroundPosition: t.pos ?? "0 0" });

  return (
    <div className="tp" ref={wrap}>
      <button className="tp-btn" onClick={() => setOpen((o) => !o)} aria-label="Change background theme" aria-haspopup="dialog" aria-expanded={open} title="Background theme">
        <span className="tp-sw" style={prev(cur)} />
      </button>
      {open && (
        <div className="tp-pop" role="dialog" aria-label="Background theme">
          {families.map((f) => (
            <div key={f} className="tp-fam">
              <div className="tp-fname">{f}</div>
              <div className="tp-row">
                {THEMES.filter((t) => t.family === f).map((t) => (
                  <button key={t.id} className={"tp-tile" + (t.id === id ? " sel" : "")} onClick={() => pick(t)} aria-pressed={t.id === id} aria-label={`${t.family}: ${t.name}`}>
                    <span className="tp-prev" style={prev(t)} />
                    <span className="tp-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
