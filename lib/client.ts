import type { Color, Note } from "./rules";

// One storage interface. Inside the Tauri shell it calls Rust commands (which
// enforce the same rules); in a browser it talks to the Next API routes.
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface NotesClient {
  list(month: string): Promise<Note[]>;
  add(date: string, text: string, color: Color): Promise<Result<Note>>;
  patch(month: string, id: string, body: { text?: string; color?: Color; completed?: boolean }): Promise<Result<Note>>;
  comment(month: string, id: string, text: string): Promise<Result<Note>>;
  remove(month: string, id: string): Promise<Result<null>>;
}

const json = { "content-type": "application/json" };

async function http<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const r = await fetch(url, { cache: "no-store", ...init });
    const body = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, data: body as T } : { ok: false, error: body.error ?? `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

const webClient: NotesClient = {
  async list(month) {
    const r = await http<Note[]>(`/api/notes?month=${month}`);
    return r.ok ? r.data : [];
  },
  add: (date, text, color) => http("/api/notes", { method: "POST", headers: json, body: JSON.stringify({ date, text, color }) }),
  patch: (month, id, body) => http("/api/notes", { method: "PATCH", headers: json, body: JSON.stringify({ month, id, ...body }) }),
  comment: (month, id, text) => http("/api/notes", { method: "POST", headers: json, body: JSON.stringify({ month, id, comment: text }) }),
  remove: (month, id) => http(`/api/notes?month=${month}&id=${id}`, { method: "DELETE" }),
};

async function call<T>(cmd: string, args: Record<string, unknown>): Promise<Result<T>> {
  const { invoke } = await import("@tauri-apps/api/core");
  try {
    return { ok: true, data: await invoke<T>(cmd, args) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

const tauriClient: NotesClient = {
  async list(month) {
    const r = await call<Note[]>("list_notes", { month });
    return r.ok ? r.data : [];
  },
  add: (date, text, color) => call("add_note", { date, text, color }),
  patch: (month, id, body) => call("patch_note", { month, id, text: body.text ?? null, color: body.color ?? null, completed: body.completed ?? null }),
  comment: (month, id, text) => call("add_comment", { month, id, comment: text }),
  remove: (month, id) => call("delete_note", { month, id }),
};

export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
export const client = (): NotesClient => (isTauri() ? tauriClient : webClient);
