import { promises as fs } from "fs";
import path from "path";
import type { Note } from "./rules";

const DIR = path.join(process.cwd(), "data");

export const validMonth = (m: string) => /^\d{4}-\d{2}$/.test(m);
export const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

const file = (month: string) => path.join(DIR, `${month}.json`);

export async function readMonth(month: string): Promise<Note[]> {
  try {
    return JSON.parse(await fs.readFile(file(month), "utf8"));
  } catch {
    return [];
  }
}

export async function writeMonth(month: string, notes: Note[]) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(file(month), JSON.stringify(notes, null, 2));
}
