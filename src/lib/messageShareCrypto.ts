import "server-only";
import { createCipheriv, createDecipheriv, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import type { SharePayload } from "@/types/share";
import { isSharedPhotoDataUrl, isSafeMusicPath } from "@/types/share";
import { isExternalMusic } from "@/lib/externalMusic";

const ITERATIONS = 220_000;
const VERSION = 1;

type Envelope = { v: 1; k: string; n: string; t: string; c: string };

function serverSecret(): Buffer {
  const value = process.env.DEARPLUME_SHARE_SECRET;
  if (!value || !/^[0-9a-fA-F]{64}$/.test(value)) throw new Error("Sharing is not configured. Set DEARPLUME_SHARE_SECRET to 64 hex characters.");
  return Buffer.from(value, "hex");
}
function createKey(password: string, accessSalt: string, kdfSalt: Buffer): Buffer {
  const passwordKey = pbkdf2Sync(`${password}\0${accessSalt}`, kdfSalt, ITERATIONS, 32, "sha256");
  return createHmac("sha256", serverSecret()).update("dearplume:share:v1").update(passwordKey).digest();
}
export function encryptShare(payload: SharePayload, password: string, accessSalt: string): string {
  const kdfSalt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createKey(password, accessSalt, kdfSalt), iv);
  const plaintext = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const envelope: Envelope = { v: VERSION, k: kdfSalt.toString("base64url"), n: iv.toString("base64url"), t: cipher.getAuthTag().toString("base64url"), c: ciphertext.toString("base64url") };
  return Buffer.from(JSON.stringify(envelope)).toString("base64url");
}
export function decryptShare(token: string, password: string, accessSalt: string): SharePayload {
  if (token.length > 25_000 || token.length < 40 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error("Invalid share link.");
  let envelope: Envelope;
  try {
    envelope = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Envelope;
    if (envelope.v !== VERSION || typeof envelope.k !== "string" || typeof envelope.n !== "string" || typeof envelope.t !== "string" || typeof envelope.c !== "string") throw new Error("Invalid token.");
    const kdfSalt = Buffer.from(envelope.k, "base64url");
    const iv = Buffer.from(envelope.n, "base64url");
    const tag = Buffer.from(envelope.t, "base64url");
    const ciphertext = Buffer.from(envelope.c, "base64url");
    if (kdfSalt.length !== 16 || iv.length !== 12 || tag.length !== 16 || ciphertext.length > 16_000) throw new Error("Invalid envelope.");
    const decipher = createDecipheriv("aes-256-gcm", createKey(password, accessSalt, kdfSalt), iv);
    decipher.setAuthTag(tag);
    const zipped = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const data = gunzipSync(zipped, { maxOutputLength: 35_000 });
    const payload: SharePayload = JSON.parse(data.toString("utf8"));
    if (payload.v !== 1 || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now() || !payload.note || typeof payload.note.title !== "string" || typeof payload.note.message !== "string" || typeof payload.note.asciiArt !== "string" || (payload.note.photoDataUrl !== undefined && (!isSharedPhotoDataUrl(payload.note.photoDataUrl) || !payload.note.asciiArt)) || !payload.appearance || (payload.note.music !== undefined && (!payload.note.music || !isSafeMusicPath(payload.note.music.pathname) || typeof payload.note.music.name !== "string" || payload.note.music.name.length > 160)) || (payload.note.externalMusic !== undefined && !isExternalMusic(payload.note.externalMusic)) || (payload.note.music !== undefined && payload.note.externalMusic !== undefined)) throw new Error("Expired or invalid share.");
    return payload;
  } catch { throw new Error("Unable to unlock this note. Check credentials, or it may have expired."); }
}
