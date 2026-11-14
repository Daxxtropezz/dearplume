import { durationMs } from "./defaults";
import type { AppSettings, LocalUnit } from "@/types/settings";
import type { Message, NoteExpiration } from "@/types/message";

export type ExpirationChoice = "default" | "never" | "after";

export function validNoteExpiration(value: unknown): value is NoteExpiration {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (item.mode === "never") return true;
  return item.mode === "after" && Number.isInteger(item.value) && Number(item.value) >= 1 && Number(item.value) <= 365 &&
    (item.unit === "days" || item.unit === "weeks" || item.unit === "months") &&
    typeof item.expiresAt === "number" && Number.isFinite(item.expiresAt) && item.expiresAt > 0;
}

export function buildNoteExpiration(choice: ExpirationChoice, value: number, unit: LocalUnit, now: number,
  previous?: NoteExpiration): NoteExpiration | undefined {
  if (choice === "default") return undefined;
  if (choice === "never") return { mode: "never" };
  if (!Number.isInteger(value) || value < 1 || value > 365 || !["days", "weeks", "months"].includes(unit)) {
    throw new Error("Choose an expiration from 1 to 365 days, weeks, or months.");
  }
  // Editing title, photos, or message must never silently extend an existing expiry.
  if (previous?.mode === "after" && previous.value === value && previous.unit === unit) return previous;
  return { mode: "after", value, unit, expiresAt: now + durationMs(value, unit) };
}

export function noteExpiresAt(note: Message, settings: AppSettings): number | null {
  if (note.localExpiration?.mode === "never") return null;
  if (note.localExpiration?.mode === "after") return note.localExpiration.expiresAt;
  if (settings.localRetention.mode === "never") return null;
  return note.createdAt + durationMs(settings.localRetention.value, settings.localRetention.unit);
}
export function isNoteExpired(note: Message, settings: AppSettings, now = Date.now()): boolean {
  const deadline = noteExpiresAt(note, settings);
  return deadline !== null && now >= deadline;
}
