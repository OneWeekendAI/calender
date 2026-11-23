import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { COLORS, isLocked, type Color, type Note } from "../../../lib/rules";
import { readMonth, writeMonth, validMonth, validDate } from "../../../lib/store";

export const dynamic = "force-dynamic";

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!validMonth(month)) return err("month must be YYYY-MM", 400);
  return NextResponse.json(await readMonth(month));
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (b && typeof b.comment === "string") {
    const month = String(b.month ?? "");
    if (!validMonth(month) || typeof b.id !== "string" || !b.comment.trim()) return err("month, id and comment required", 400);
    const notes = await readMonth(month);
    const n = notes.find((x) => x.id === b.id);
    if (!n) return err("not found", 404);
    n.comments = [...(n.comments ?? []), { id: randomUUID(), text: b.comment, createdAt: Date.now() }];
    await writeMonth(month, notes);
    return NextResponse.json(n);
  }
  if (!b || typeof b.text !== "string" || !b.text.trim() || !validDate(b.date ?? ""))
    return err("date (YYYY-MM-DD) and non-empty text required", 400);
  const color: Color = COLORS.includes(b.color) ? b.color : "yellow";
  const note: Note = {
    id: randomUUID(),
    date: b.date,
    text: b.text,
    color,
    completed: false,
    createdAt: Date.now(),
    comments: [],
  };
  const month = note.date.slice(0, 7);
  const notes = await readMonth(month);
  notes.push(note);
  await writeMonth(month, notes);
  return NextResponse.json(note, { status: 201 });
}

export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null);
  const month = String(b?.month ?? "");
  if (!b || !validMonth(month) || typeof b.id !== "string") return err("month and id required", 400);
  const notes = await readMonth(month);
  const n = notes.find((x) => x.id === b.id);
  if (!n) return err("not found", 404);
  if (isLocked(n)) return err("note is locked (older than 1 hour); add a comment instead", 403);
  if (typeof b.text === "string" && b.text.trim()) n.text = b.text;
  if (typeof b.completed === "boolean") n.completed = b.completed;
  if (COLORS.includes(b.color)) n.color = b.color;
  await writeMonth(month, notes);
  return NextResponse.json(n);
}

export async function DELETE(req: Request) {
  const sp = new URL(req.url).searchParams;
  const month = sp.get("month") ?? "";
  const id = sp.get("id") ?? "";
  if (!validMonth(month) || !id) return err("month and id required", 400);
  const notes = await readMonth(month);
  const n = notes.find((x) => x.id === id);
  if (!n) return err("not found", 404);
  if (isLocked(n)) return err("note is locked (older than 1 hour)", 403);
  await writeMonth(month, notes.filter((x) => x.id !== id));
  return NextResponse.json({ ok: true });
}
