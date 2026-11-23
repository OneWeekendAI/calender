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
