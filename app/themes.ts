/* Procedural backgrounds: CSS gradients + inline SVG (feTurbulence / lighting). No external images. */

const url = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}")`;
const svg = (w: number, h: number, body: string) => url(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

/** Lit relief (plaster / clay): turbulence lit by a distant light. */
const relief = (size: number, freq: string, oct: number, scale: number, color: string, az = 225, el = 55, seed = 3) =>
  svg(size, size, `<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}" stitchTiles="stitch" result="t"/><feDiffuseLighting in="t" surfaceScale="${scale}" diffuseConstant="1.05" lighting-color="${color}"><feDistantLight azimuth="${az}" elevation="${el}"/></feDiffuseLighting></filter><rect width="100%" height="100%" filter="url(#f)"/>`);

/** Tinted grain: alpha driven by noise. */
const grain = (size: number, freq: string, rgb: string, a: number, off: number, seed = 7) =>
  svg(size, size, `<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${rgb.split(" ")[0]} 0 0 0 0 ${rgb.split(" ")[1]} 0 0 0 0 ${rgb.split(" ")[2]} ${a} 0 0 0 ${off}"/></filter><rect width="100%" height="100%" filter="url(#f)"/>`);

const cracks = svg(
  640, 520,
  `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
   <g stroke="#fff8e6" stroke-opacity=".5" stroke-width="2.4" transform="translate(1.2 1.2)">
    <path d="M40 0 L52 60 L38 98 L60 150 L48 210 L70 262 L58 300"/><path d="M52 60 L110 82 L150 70 L214 104"/><path d="M60 150 L130 160 L170 200"/>
    <path d="M300 0 L284 70 L318 120 L300 190 L340 240 L330 330 L360 400 L350 520"/><path d="M318 120 L380 110 L430 150 L520 140 L560 180"/><path d="M340 240 L270 270 L240 330"/>
    <path d="M560 0 L548 60 L590 110 L580 200 L620 260 L610 330"/><path d="M130 520 L142 450 L120 400 L156 350 L150 300"/><path d="M430 520 L440 470 L470 440 L520 450 L560 420 L640 430"/></g>
   <g stroke="#3b2a1e" stroke-opacity=".62" stroke-width="1.3">
    <path d="M40 0 L52 60 L38 98 L60 150 L48 210 L70 262 L58 300"/><path d="M52 60 L110 82 L150 70 L214 104"/><path d="M60 150 L130 160 L170 200"/>
    <path d="M300 0 L284 70 L318 120 L300 190 L340 240 L330 330 L360 400 L350 520"/><path d="M318 120 L380 110 L430 150 L520 140 L560 180"/><path d="M340 240 L270 270 L240 330"/>
    <path d="M560 0 L548 60 L590 110 L580 200 L620 260 L610 330"/><path d="M130 520 L142 450 L120 400 L156 350 L150 300"/><path d="M430 520 L440 470 L470 440 L520 450 L560 420 L640 430"/></g></g>`
);

/* Original folk-mural line motifs (white on ochre): dancers in a ring, tree, hut, sun, birds. */
const warli = (() => {
  const man = (x: number, y: number, s = 1, tilt = 0) =>
    `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${s})"><circle cx="0" cy="-17" r="4"/><path d="M-8 12 L0 -11 L8 12 Z"/><path d="M-5 12 L-8 26 M5 12 L8 26 M-3 -6 L-14 2 M3 -6 L14 -2"/></g>`;
  const ring = (cx: number, cy: number, r: number, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return man(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.62, (a * 180) / Math.PI + 90);
    }).join("") + `<circle cx="${cx}" cy="${cy}" r="${r - 24}" stroke-dasharray="2 6"/>`;
  const tree = (x: number, y: number) =>
    `<path d="M${x} ${y} V${y - 70} M${x} ${y - 20} L${x - 18} ${y - 38} M${x} ${y - 20} L${x + 18} ${y - 38} M${x} ${y - 44} L${x - 14} ${y - 62} M${x} ${y - 44} L${x + 14} ${y - 62}"/><path d="M${x - 10} ${y - 84} l10 -12 l10 12 l-10 12 Z"/>`;
  const hut = (x: number, y: number) =>
    `<path d="M${x - 24} ${y} h48 v-26 h-48 Z M${x - 30} ${y - 26} L${x} ${y - 52} L${x + 30} ${y - 26} Z M${x - 6} ${y} v-14 h12 v14"/>`;
  const sun = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="11"/>` + Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; return `<path d="M${x + Math.cos(a) * 16} ${y + Math.sin(a) * 16} L${x + Math.cos(a) * 24} ${y + Math.sin(a) * 24}"/>`; }).join("");
  const bird = (x: number, y: number) => `<path d="M${x - 12} ${y} Q${x - 5} ${y - 9} ${x} ${y} Q${x + 5} ${y - 9} ${x + 12} ${y}"/>`;
  return svg(
    520, 420,
    `<g fill="none" stroke="#fff6e2" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      ${ring(130, 130, 62, 9)}${sun(330, 60)}${tree(420, 190)}${hut(310, 190)}${bird(230, 40)}${bird(250, 28)}${bird(470, 80)}
      ${tree(60, 380)}${hut(200, 392)}${man(300, 350, 1)}${man(340, 350, 1, 6)}${ring(430, 330, 50, 7)}
    </g>`
  );
})();

const brick = (() => {
  const rows = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 3 }, (_, c) => {
      const w = 60, x = c * w - (r % 2 ? w / 2 : 0), shade = [0, 6, -5, 9, -8, 3][(r * 3 + c) % 6];
      return `<rect x="${x + 1.5}" y="${r * 24 + 1.5}" width="${w - 3}" height="21" rx="1.5" fill="hsl(${12 + shade} ${38 + shade}% ${34 + shade / 2}%)"/>`;
    }).join("")
  ).join("");
  return svg(180, 144, `<rect width="180" height="144" fill="#4a2f26"/>${rows}`);
})();

/* Original tags: looping scribble "signatures" with drips. Not letterforms from any real artist. */
const tags = svg(
  1200, 800,
  `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
   <g stroke="#1b1010" stroke-width="15" stroke-opacity=".45" transform="translate(5 6)"><path d="M70 640 C110 560 140 700 190 600 S250 540 280 650 S350 560 380 620 C420 680 460 560 520 640"/></g>
   <path d="M70 640 C110 560 140 700 190 600 S250 540 280 650 S350 560 380 620 C420 680 460 560 520 640" stroke="#ffd23f" stroke-width="12"/>
   <path d="M60 690 C200 720 380 700 540 690" stroke="#ffd23f" stroke-width="5" stroke-opacity=".8"/>
   <path d="M200 650 V735 M285 655 V700 M385 628 V770 M485 645 V690" stroke="#ffd23f" stroke-width="5"/>
   <circle cx="200" cy="740" r="5" fill="#ffd23f"/><circle cx="385" cy="775" r="6" fill="#ffd23f"/>
   <path d="M820 150 C860 80 900 210 940 120 C980 40 1020 200 1060 110 L1100 170" stroke="#1b1010" stroke-opacity=".4" stroke-width="13" transform="translate(5 6)"/>
   <path d="M820 150 C860 80 900 210 940 120 C980 40 1020 200 1060 110 L1100 170" stroke="#3ee0c4" stroke-width="10"/>
   <path d="M840 215 C920 235 1010 225 1090 205" stroke="#ff5d8f" stroke-width="5"/>
   <path d="M875 148 V215 M1020 120 V190 M1080 130 V150" stroke="#3ee0c4" stroke-width="4"/><circle cx="875" cy="222" r="4.5" fill="#3ee0c4"/><circle cx="1020" cy="197" r="4.5" fill="#3ee0c4"/>
   </g>`
);

const scraps = svg(
  760, 560,
  `<g stroke-linejoin="round">
   <g transform="rotate(-5 120 110)"><path d="M30 40 L205 34 L212 70 L200 130 L214 190 L40 196 L26 120 Z" fill="#e8dcc3" fill-opacity=".78"/><rect x="52" y="62" width="120" height="14" fill="#2a2a2a" fill-opacity=".55"/><rect x="52" y="90" width="90" height="8" fill="#2a2a2a" fill-opacity=".4"/><rect x="52" y="108" width="132" height="8" fill="#b3342a" fill-opacity=".55"/><rect x="52" y="150" width="70" height="8" fill="#2a2a2a" fill-opacity=".4"/></g>
   <g transform="rotate(4 520 150)"><path d="M420 60 L610 70 L600 130 L616 236 L430 230 L416 150 Z" fill="#c9d3da" fill-opacity=".72"/><circle cx="500" cy="145" r="40" fill="none" stroke="#243a56" stroke-opacity=".6" stroke-width="7"/><path d="M500 118 l9 20 l22 2 l-17 14 l6 22 l-20 -12 l-20 12 l6 -22 l-17 -14 l22 -2 Z" fill="#243a56" fill-opacity=".6"/></g>
   <g transform="rotate(-3 200 420)"><path d="M60 330 L330 340 L338 420 L322 500 L70 494 L52 410 Z" fill="#efe6cf" fill-opacity=".7"/><path d="M92 470 V366 H130 V400 H162 V366 H196" fill="none" stroke="#1d1d1d" stroke-opacity=".55" stroke-width="12"/><rect x="220" y="372" width="86" height="10" fill="#1d1d1d" fill-opacity=".45"/><rect x="220" y="398" width="60" height="10" fill="#c1432d" fill-opacity=".55"/><rect x="220" y="430" width="86" height="8" fill="#1d1d1d" fill-opacity=".35"/></g>
   <g transform="rotate(7 600 440)"><path d="M520 380 L690 372 L700 456 L680 520 L532 514 Z" fill="#f1d9a5" fill-opacity=".72"/><path d="M548 495 L560 410 L586 495 M552 468 H582" fill="none" stroke="#2b2b2b" stroke-opacity=".6" stroke-width="9"/><path d="M610 410 H668 M610 440 H660 M610 470 H650" stroke="#2b2b2b" stroke-opacity=".45" stroke-width="8"/></g>
   <path d="M690 250 l14 28 l30 4 l-22 21 l6 30 l-28 -15 l-28 15 l6 -30 l-22 -21 l30 -4 Z" fill="#23262b" fill-opacity=".45"/>
   <path d="M260 250 h70 v-22 l60 44 l-60 44 v-22 h-70 Z" fill="#23262b" fill-opacity=".4"/>
   </g>`
);

const formTies = svg(360, 240, `<g fill="#3d4044" fill-opacity=".45"><circle cx="60" cy="60" r="7"/><circle cx="180" cy="60" r="7"/><circle cx="300" cy="60" r="7"/><circle cx="60" cy="180" r="7"/><circle cx="180" cy="180" r="7"/><circle cx="300" cy="180" r="7"/></g><path d="M0 120.5 H360 M120.5 0 V240 M240.5 0 V240" stroke="#2b2d30" stroke-opacity=".28" fill="none"/>`);

const neonSigns = svg(
  1200, 800,
  `<defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#g)" stroke-width="7">
     <path d="M880 120 h200 a30 30 0 0 1 30 30 v70 a30 30 0 0 1 -30 30 h-200 a30 30 0 0 1 -30 -30 v-70 a30 30 0 0 1 30 -30 Z" stroke="#ff4fa3"/>
     <path d="M900 185 q25 -50 50 0 t50 0 t50 0" stroke="#ff9ad1"/>
     <path d="M110 560 l60 -90 l60 90 M130 530 h80" stroke="#2fe6d6"/>
     <circle cx="330" cy="500" r="38" stroke="#2fe6d6"/>
     <path d="M80 160 V90 H200" stroke="#9b7bff"/>
   </g>`
);

export type Theme = {
  id: string; name: string; family: string; dark?: boolean;
  layers: string; size: string; pos?: string; /* the fixed background layer */
  vars: Record<string, string>;
};

const lightText = { "--fg": "#2a1f19", "--muted": "#6a5748", "--ink": "#2b2823" };

export const THEMES: Theme[] = [
  { id: "paper", name: "Paper desk", family: "Paper", layers: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.4), transparent 60%), linear-gradient(#e7e0d2, #ddd5c5)", size: "auto", vars: {} },

  /* ---- Clay ---- */
  { id: "clay-terracotta", name: "Terracotta plaster", family: "Clay",
    layers: `${grain(300, ".006 .008", "0.35 0.12 0.05", 1.1, -.35, 4)}, ${relief(512, ".012 .014", 5, 3.2, "#c9724f", 225, 52, 11)}`, size: "auto, 512px",
    vars: { ...lightText, "--panel": "rgba(251,238,224,.9)", "--panel-solid": "#fbeee0", "--board-bg": "rgba(246,226,206,.3)", "--line": "rgba(92,48,30,.26)", "--accent": "#8f3a1e", "--desk": "#fbeee0", "--desk-2": "#f3dcc4" } },
  { id: "clay-pottery", name: "Unglazed pottery", family: "Clay",
    layers: `${grain(220, ".9 .9", "0.2 0.1 0.05", 2.6, -1.35, 9)}, repeating-linear-gradient(180deg, rgba(255,235,200,.12) 0 6px, rgba(90,45,20,.1) 6px 9px, rgba(255,235,200,0) 9px 22px), linear-gradient(180deg, #d9a273, #c98d5f 40%, #b87850)`, size: "220px, auto, auto",
    vars: { ...lightText, "--panel": "rgba(252,240,225,.9)", "--panel-solid": "#fcf0e1", "--board-bg": "rgba(247,228,205,.3)", "--line": "rgba(96,52,26,.28)", "--accent": "#8a4118", "--desk": "#fcf0e1", "--desk-2": "#f4ddc3" } },
  { id: "clay-ridges", name: "Sculpted ridges", family: "Clay",
    layers: relief(600, ".003 .02", 3, 3.4, "#c98562", 270, 48, 5), size: "600px",
    vars: { ...lightText, "--panel": "rgba(250,236,224,.9)", "--panel-solid": "#faece0", "--board-bg": "rgba(244,224,208,.3)", "--line": "rgba(90,50,32,.26)", "--accent": "#843a22", "--desk": "#faece0", "--desk-2": "#f2d9c4" } },

  /* ---- Wall paintings ---- */
  { id: "wall-fresco", name: "Cracked fresco", family: "Wall paintings",
    layers: `${cracks}, ${grain(400, ".004 .004", "0.18 0.45 0.45", 1.4, -.45, 6)}, ${relief(512, ".02 .02", 4, 1.6, "#e1cfa6", 235, 62, 8)}`, size: "640px 520px, 400px, 512px",
    vars: { ...lightText, "--panel": "rgba(248,240,222,.9)", "--panel-solid": "#f8f0de", "--board-bg": "rgba(240,228,200,.3)", "--line": "rgba(70,50,28,.28)", "--accent": "#7a3a1c", "--desk": "#f8f0de", "--desk-2": "#eadbb8" } },
  { id: "wall-warli", name: "Folk mural", family: "Wall paintings",
    layers: `${warli}, ${relief(512, ".014 .014", 4, 2.4, "#c98a3a", 225, 58, 2)}`, size: "520px 420px, 512px",
    vars: { ...lightText, "--panel": "rgba(253,244,226,.92)", "--panel-solid": "#fdf4e2", "--board-bg": "rgba(250,236,208,.3)", "--line": "rgba(100,56,18,.3)", "--accent": "#8a3b10", "--desk": "#fdf4e2", "--desk-2": "#f5e2bd" } },
  { id: "wall-wash", name: "Watercolour wash", family: "Wall paintings",
    layers: `${grain(260, ".7 .7", "0.4 0.38 0.34", .9, -.22, 12)}, radial-gradient(ellipse 60% 55% at 12% 15%, rgba(150,190,220,.7), transparent 70%), radial-gradient(ellipse 55% 50% at 88% 22%, rgba(240,170,185,.6), transparent 70%), radial-gradient(ellipse 60% 55% at 70% 92%, rgba(170,205,170,.65), transparent 70%), radial-gradient(ellipse 50% 45% at 15% 85%, rgba(240,210,150,.6), transparent 70%), linear-gradient(#f6f1e6, #f6f1e6)`, size: "260px, auto, auto, auto, auto, auto",
    vars: { ...lightText, "--panel": "rgba(255,252,244,.88)", "--panel-solid": "#fffcf4", "--board-bg": "rgba(255,251,240,.3)", "--line": "rgba(60,60,70,.22)", "--accent": "#2f5b8a", "--desk": "#fffcf4", "--desk-2": "#f3eddd" } },

  /* ---- Street style ---- */
  { id: "street-brick", name: "Brick & tags", family: "Street", dark: true,
    layers: `${tags}, linear-gradient(rgba(20,10,8,.25), rgba(20,10,8,.45)), ${brick}`, size: "min(1000px, 110vw) auto, auto, 180px 144px", pos: "right bottom, 0 0, 0 0",
    vars: { "--fg": "#f4ebe4", "--muted": "#cdbfb4", "--ink": "#2b2823", "--panel": "rgba(30,18,15,.84)", "--panel-solid": "#1e120f", "--board-bg": "rgba(34,20,16,.3)", "--line": "rgba(255,236,224,.2)", "--accent": "#ffd23f", "--desk": "#1e120f", "--desk-2": "#2a1b16", "--btn-bg": "rgba(255,255,255,.08)" } },
  { id: "street-concrete", name: "Concrete & posters", family: "Street",
    layers: `${scraps}, ${formTies}, ${relief(512, ".02 .02", 5, 1.8, "#c4c6c6", 225, 60, 14)}`, size: "760px 560px, 360px 240px, 512px",
    vars: { ...lightText, "--panel": "rgba(236,237,236,.92)", "--panel-solid": "#ecedec", "--board-bg": "rgba(222,224,224,.3)", "--line": "rgba(30,32,34,.3)", "--accent": "#a3261a", "--desk": "#ecedec", "--desk-2": "#d9dbdb" } },
  { id: "street-neon", name: "Neon alley", family: "Street", dark: true,
    layers: `${neonSigns}, radial-gradient(ellipse 70% 40% at 50% 105%, rgba(255,79,163,.28), transparent 70%), radial-gradient(ellipse 60% 50% at 10% 0%, rgba(47,230,214,.16), transparent 70%), ${svg(90, 48, `<g fill="none" stroke="#1d2038" stroke-width="2"><path d="M0 1H90M0 25H90M45 1V25M0 25V49M45 25V49"/></g>`)}, linear-gradient(#0a0c18, #121528)`, size: "min(1100px, 110vw) auto, auto, auto, 90px 48px, auto", pos: "right bottom, 0 0, 0 0, 0 0, 0 0",
    vars: { "--fg": "#eaf2ff", "--muted": "#9fb0cf", "--ink": "#2b2823", "--panel": "rgba(10,12,26,.82)", "--panel-solid": "#0a0c1a", "--board-bg": "rgba(10,12,26,.3)", "--line": "rgba(160,190,255,.24)", "--accent": "#34f0dc", "--desk": "#0a0c1a", "--desk-2": "#121528", "--btn-bg": "rgba(255,255,255,.07)" } },
];

export const THEME_KEY = "calendar-theme";
export const byId = (id: string | null) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** CSS injected into <head>: per-theme variables + background layer. */
export function themeCss(): string {
  return THEMES.filter((t) => t.id !== "paper")
    .map((t) => {
      const vars = Object.entries({ ...t.vars, "--bg-layers": t.layers, "--bg-size": t.size, "--bg-pos": t.pos ?? "0 0", "color-scheme": t.dark ? "dark" : "light" })
        .map(([k, v]) => `${k}:${v}`)
        .join(";");
      return `html[data-theme="${t.id}"]{${vars}}`;
    })
    .join("\n");
}

/** Runs before first paint (inline in <head>): restore the saved theme, ignore storage failures. */
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t&&/^[a-z-]+$/.test(t))document.documentElement.dataset.theme=t}catch(e){}`;

