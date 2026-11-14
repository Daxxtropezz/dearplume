import { messagePhotos, MAX_LOCAL_PHOTO_BYTES, MAX_NOTE_PHOTOS, MAX_TOTAL_LOCAL_PHOTO_BYTES, type Message, type MessageBackup, type MessagePhoto } from "@/types/message";
import type { AppSettings } from "@/types/settings";
import { isNoteExpired, validNoteExpiration } from "./noteExpiration";
import { parseExternalMusicLink, originalMusicUrl } from "./externalMusic";

const DB_NAME = "dearplume-private-notes";
const STORE = "notes";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local storage."));
  });
}
async function transaction<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    let output: T;
    req.onsuccess = () => { output = req.result; };
    tx.oncomplete = () => { db.close(); resolve(output); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("Local database operation failed.")); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Local database operation canceled.")); };
  });
}
export async function listMessages(): Promise<Message[]> {
  const rows = await transaction<Message[]>("readonly", (store) => store.getAll());
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}
export function putMessage(note: Message): Promise<IDBValidKey> {
  return transaction("readwrite", (store) => store.put(note));
}
export function removeMessage(id: string): Promise<undefined> {
  return transaction("readwrite", (store) => store.delete(id));
}
export async function clearMessages(): Promise<void> {
  await transaction("readwrite", (store) => store.clear());
}
export async function purgeExpiredMessages(settings: AppSettings): Promise<number> {
  const now = Date.now();
  const expired = (await listMessages()).filter((note) => isNoteExpired(note, settings, now));
  for (const note of expired) await removeMessage(note.id);
  return expired.length;
}
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Cannot read attachment for backup."));
    reader.readAsDataURL(blob);
  });
}
export async function exportBackup(notes: Message[]): Promise<string> {
  const backup: MessageBackup[] = [];
  for (const note of notes) {
    const { photo, photos, music, ...rest } = note;
    const attachments = messagePhotos(note);
    backup.push({ ...rest,
      ...(attachments.length ? { photos: await Promise.all(attachments.map(async (item) => ({ id: item.id, ...(item.name ? { name: item.name } : {}), photoDataUrl: await blobToDataUrl(item.blob) }))) } : {}),
      ...(photo && !photos?.length ? { photoDataUrl: await blobToDataUrl(photo) } : {}),
      ...(music ? { musicDataUrl: (await blobToDataUrl(music)).replace(/^data:[^;]+;base64,/, "data:audio/mpeg;base64,") } : {}) });
  }
  return JSON.stringify({ app: "Dearplume", version: 1, exportedAt: new Date().toISOString(), notes: backup }, null, 2);
}
export async function importBackup(raw: string): Promise<number> {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !("app" in parsed) || parsed.app !== "Dearplume" || !("notes" in parsed) || !Array.isArray(parsed.notes)) {
    throw new Error("Not a Dearplume backup file.");
  }
  if (parsed.notes.length > 500) throw new Error("Backups can contain up to 500 notes.");
  const validated: Message[] = [];
  for (const entry of parsed.notes) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || entry.id.length > 100 || !entry.id || typeof entry.title !== "string" || entry.title.length > 120 || typeof entry.message !== "string" || entry.message.length > 5000 || !Number.isFinite(entry.createdAt) || !Number.isFinite(entry.updatedAt)) throw new Error("Backup contains an invalid note.");
    if (entry.localExpiration !== undefined && !validNoteExpiration(entry.localExpiration)) throw new Error("Backup contains an invalid note expiration.");
    let photo: Blob | undefined;
    if (entry.photoDataUrl !== undefined) {
      if (typeof entry.photoDataUrl !== "string" || entry.photoDataUrl.length > 9_000_000 || !/^data:image\/(png|jpeg|webp|gif);base64,/.test(entry.photoDataUrl)) throw new Error("Backup contains an invalid photo.");
      const response = await fetch(entry.photoDataUrl);
      photo = await response.blob();
      if (photo.size > 6_000_000) throw new Error("A photo in the backup is too large.");
    }
    let photos: MessagePhoto[] | undefined;
    if (entry.photos !== undefined) {
      if (!Array.isArray(entry.photos) || entry.photos.length > MAX_NOTE_PHOTOS) throw new Error("Backup contains too many pictures.");
      const seen = new Set<string>();
      let totalBytes = 0;
      photos = [];
      for (const item of entry.photos) {
        if (!item || typeof item !== "object" || typeof item.id !== "string" || !/^[A-Za-z0-9:_-]{1,100}$/.test(item.id) || seen.has(item.id) ||
            (item.name !== undefined && (typeof item.name !== "string" || item.name.length > 180)) ||
            typeof item.photoDataUrl !== "string" || item.photoDataUrl.length > 9_000_000 ||
            !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(item.photoDataUrl)) throw new Error("Backup contains an invalid picture.");
        seen.add(item.id);
        const response = await fetch(item.photoDataUrl);
        const blob = await response.blob();
        totalBytes += blob.size;
        if (blob.size > MAX_LOCAL_PHOTO_BYTES || totalBytes > MAX_TOTAL_LOCAL_PHOTO_BYTES) throw new Error("Pictures in this note exceed the storage limit.");
        photos.push({ id: item.id, blob, ...(item.name ? { name: item.name } : {}) });
      }
      if (entry.mainPhotoId !== undefined && (typeof entry.mainPhotoId !== "string" || !seen.has(entry.mainPhotoId))) throw new Error("Backup has an invalid main picture selection.");
    }
    if (photo && !photos?.length) photos = [{ id: "legacy-main", blob: photo, name: "Original picture" }];
    if (photos?.length && !photos.find((item) => item.id === entry.mainPhotoId)) entry.mainPhotoId = photos[0].id;
    let music: Blob | undefined;
    if (entry.musicDataUrl !== undefined) {
      if (typeof entry.musicDataUrl !== "string" || entry.musicDataUrl.length > 2_800_000 || !/^data:audio\/mpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(entry.musicDataUrl)) throw new Error("Backup contains invalid music.");
      const response = await fetch(entry.musicDataUrl);
      music = await response.blob();
      if (music.size > 2_000_000) throw new Error("Music in backup is too large.");
    }
    if (entry.musicName !== undefined && (typeof entry.musicName !== "string" || entry.musicName.length > 160)) throw new Error("Invalid music filename.");
    if (entry.musicLink !== undefined && (typeof entry.musicLink !== "string" || !parseExternalMusicLink(entry.musicLink))) throw new Error("Backup has an invalid external music link.");
    if (music && entry.musicLink) throw new Error("A note can have either a song link or an MP3, not both.");
    validated.push({ id: entry.id, title: entry.title, message: entry.message, createdAt: entry.createdAt, updatedAt: entry.updatedAt, ...(entry.localExpiration ? { localExpiration: entry.localExpiration } : {}), photos, mainPhotoId: photos?.length ? entry.mainPhotoId : undefined, music, musicName: music ? (entry.musicName || "Attached music.mp3") : undefined, musicLink: entry.musicLink ? originalMusicUrl(parseExternalMusicLink(entry.musicLink)!) : undefined });
  }
  for (const note of validated) await putMessage(note);
  return validated.length;
}
