export const DELETE_WINDOW_MS = 60 * 60 * 1000;

export type Color = "yellow" | "pink" | "blue" | "green" | "orange";
export const COLORS: Color[] = ["yellow", "pink", "blue", "green", "orange"];

export type Note = {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  color: Color;
  completed: boolean;
  createdAt: number; // epoch ms
};

export function canDelete(createdAt: number, now: number = Date.now()): boolean {
  return now - createdAt <= DELETE_WINDOW_MS;
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
