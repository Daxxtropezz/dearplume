import "server-only";
import { put, get, del, list } from "@vercel/blob";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const MAX_MUSIC_BYTES = 2_000_000;
const PREFIX = "dearplume/music/";
const MAGIC = Buffer.from("DPM1");

function musicKey(): Buffer {
  const hex = process.env.DEARPLUME_SHARE_SECRET;
  if (!hex || !/^[a-f0-9]{64}$/i.test(hex)) throw new Error("Sharing is not configured.");
  return createHash("sha256").update("dearplume private music v1\0").update(Buffer.from(hex, "hex")).digest();
}
function checkAudio(audio: Buffer): void {
  if (!audio.length || audio.length > MAX_MUSIC_BYTES || !(audio.subarray(0, 3).toString() === "ID3" || (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0))) {
    throw new Error("MP3 must be 2 MB or smaller with a valid MP3 header.");
  }
}
export function parseMusicDataUrl(raw: unknown): Buffer | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "string" || raw.length > 2_700_000 || !/^data:audio\/mpeg;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw)) throw new Error("Invalid MP3 attachment.");
  const audio = Buffer.from(raw.slice("data:audio/mpeg;base64,".length), "base64");
  checkAudio(audio);
  return audio;
}
function packMusic(audio: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", musicKey(), iv);
  const encrypted = Buffer.concat([cipher.update(audio), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]);
}
function unpackMusic(encrypted: Buffer): Buffer {
  if (encrypted.length < 36 || !encrypted.subarray(0, 4).equals(MAGIC) || encrypted.length > MAX_MUSIC_BYTES + 40) throw new Error("Invalid stored audio.");
  const decipher = createDecipheriv("aes-256-gcm", musicKey(), encrypted.subarray(4, 16));
  decipher.setAuthTag(encrypted.subarray(16, 32));
  const audio = Buffer.concat([decipher.update(encrypted.subarray(32)), decipher.final()]);
  checkAudio(audio);
  return audio;
}
export async function storeMusic(audio: Buffer, expiresAt: number): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) throw new Error("Music sharing needs Vercel Blob private storage. Configure BLOB_READ_WRITE_TOKEN first, or remove music from the note.");
  checkAudio(audio);
  const pathname = `${PREFIX}${expiresAt}/${randomBytes(16).toString("hex")}.bin`;
  await put(pathname, new Blob([new Uint8Array(packMusic(audio))]), { access: "private", contentType: "application/octet-stream", addRandomSuffix: false });
  return pathname;
}
export async function readMusic(pathname: string): Promise<Buffer> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream || (result.blob.size && result.blob.size > MAX_MUSIC_BYTES + 40)) throw new Error("Music no longer available.");
  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  return unpackMusic(buffer);
}
export async function deleteMusic(pathname: string): Promise<void> { await del(pathname); }

/** Cleanup is optional but strongly recommended for scheduled Vercel deployments. */
export async function purgeExpiredMusic(): Promise<number> {
  let cursor: string | undefined;
  let deleted = 0;
  for (let page = 0; page < 100; page++) {
    const result = await list({ prefix: PREFIX, cursor, limit: 1000 });
    const expired = result.blobs.filter((item) => {
      const match = /^dearplume\/music\/(\d{13})\/[a-f0-9]{32}\.bin$/.exec(item.pathname);
      return match && Number(match[1]) <= Date.now();
    });
    if (expired.length) { await del(expired.map((item) => item.pathname)); deleted += expired.length; }
    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }
  return deleted;
}
