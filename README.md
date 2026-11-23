# calender

A OneWeekendAI project.

## meetcal desktop app (macOS, Tauri)

**Install:** open `meetcal_0.1.0_aarch64.dmg` and drag meetcal to Applications. The app is unsigned (ad-hoc), so the first time right-click it and choose Open, then confirm.

Notes live as one JSON file per month in `~/Library/Application Support/com.oneweekendai.meetcal/notes/`. The lock/overdue rules are enforced in Rust (`src-tauri/src/rules.rs`). Use File, Import notes from folder... to merge existing `data/*.json` files.

**Dev commands**

```
npm run dev            # web version on :3000
npm test               # JS rule tests
cd src-tauri && cargo test   # Rust rule + store tests
npx tauri dev          # desktop app against the dev server
npx tauri build        # .app and .dmg in src-tauri/target/release/bundle/
```

The desktop build sets `TAURI_BUILD=1` (static export, API routes skipped); the web build is unchanged. The icon source is `assets/icon.svg`; regenerate with `npx tauri icon assets/icon.png`.
