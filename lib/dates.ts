// Pure local-date helpers for keyboard navigation (YYYY-MM-DD strings).
const p2 = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const parts = (s: string) => s.split("-").map(Number) as [number, number, number];

export function addDays(ds: string, n: number): string {
  const [y, m, d] = parts(ds);
  return fmt(new Date(y, m - 1, d + n));
}

// Same day-of-month in another month, clamped to that month's length (Jan 31 + 1 month = Feb 28/29).
export function addMonths(ds: string, n: number): string {
  const [y, m, d] = parts(ds);
  const last = new Date(y, m - 1 + n + 1, 0).getDate();
  return fmt(new Date(y, m - 1 + n, Math.min(d, last)));
}
