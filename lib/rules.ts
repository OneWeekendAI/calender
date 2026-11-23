export const DELETE_WINDOW_MS = 60 * 60 * 1000;

export type Color = "yellow" | "pink" | "blue" | "green" | "orange";
export const COLORS: Color[] = ["yellow", "pink", "blue", "green", "orange"];

export type Comment = { id: string; text: string; createdAt: number };

export type Note = {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  color: Color;
  completed: boolean;
  createdAt: number; // epoch ms
  comments: Comment[];
};

// After 1 hour a note is fully locked: no edit, color, toggle or delete.
export function isLocked(note: { createdAt: number }, now: number = Date.now()): boolean {
  return now - note.createdAt > DELETE_WINDOW_MS;
}

export function todayStr(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function isOverdue(
  note: { date: string; completed: boolean },
  today: string = todayStr(),
): boolean {
  return note.date < today && !note.completed;
}

// Whether a PATCH may be applied. An overdue note (past day, not completed)
// can never be marked completed. Otherwise unlocked: anything. Locked: only
// the one-way change completed false -> true (nothing else in the patch).
export function canPatch(
  note: { createdAt: number; completed: boolean; date?: string },
  patch: { text?: unknown; color?: unknown; completed?: unknown },
  now: number = Date.now(),
  today: string = todayStr(new Date(now)),
): boolean {
  if (note.date !== undefined && isOverdue({ date: note.date, completed: note.completed }, today) && patch.completed === true) return false;
  if (!isLocked(note, now)) return true;
  if (patch.text !== undefined || patch.color !== undefined) return false;
  return patch.completed === true;
}
