import { NextResponse } from "next/server";
import { decryptShare, encryptShare } from "@/lib/messageShareCrypto";
import { durationMs, isHexColor } from "@/lib/defaults";
import { FLYING_ICONS } from "@/types/settings";
import type { SharePayload } from "@/types/share";
import { isSharedPhotoDataUrl } from "@/types/share";
import { parseMusicDataUrl, storeMusic, deleteMusic } from "@/lib/musicStorage";
import type { ShareUnit } from "@/types/settings";
import { isExternalMusic } from "@/lib/externalMusic";
import { storeSharedToken, resolveSharedToken } from "@/lib/shareStorage";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
function json(data: object, status = 200) { return NextResponse.json(data, { status, headers }); }
function isString(value: unknown, max: number) { return typeof value === "string" && value.length > 0 && value.length <= max; }

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 2_850_000) return json({ error: "Share request is too large (MP3 limit: 2 MB)." }, 413);
    const raw = await request.text();
    if (raw.length > 2_850_000) return json({ error: "Share request is too large (MP3 limit: 2 MB)." }, 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object") return json({ error: "Invalid request." }, 400);
    if (body.action === "create") {
      const note = body.note;
      const appearance = body.appearance;
      const duration = body.duration;
      if (!note || !isString(note.title, 120) || !isString(note.message, 5000) || typeof note.asciiArt !== "string" || (note.asciiArt.length > 6_000 || (note.photoDataUrl !== undefined && (!isSharedPhotoDataUrl(note.photoDataUrl) || !note.asciiArt))) || !appearance || !isHexColor(appearance.backgroundColor) || !isHexColor(appearance.flyingColor) || !FLYING_ICONS.includes(appearance.flyingIcon) || !Number.isInteger(appearance.typingSpeedMs) || appearance.typingSpeedMs < 10 || appearance.typingSpeedMs > 150 || !duration || !Number.isInteger(duration.value) || duration.value < 1 || duration.value > 365 || !["minutes", "hours", "days"].includes(duration.unit) || !isString(body.password, 256) || body.password.length < 12 || !isString(body.accessSalt, 128) || body.accessSalt.length < 16) return json({ error: "Invalid note, credentials, or expiration settings." }, 400);
      const createdAt = Date.now();
      const expiresAt = createdAt + durationMs(duration.value, duration.unit as ShareUnit);
      if (expiresAt - createdAt > 90 * 86_400_000) return json({ error: "Share links can last up to 90 days." }, 400);
      if (note.externalMusic !== undefined && !isExternalMusic(note.externalMusic)) return json({ error: "Use a valid YouTube or Spotify track URL." }, 400);
      if (note.externalMusic && body.musicDataUrl !== undefined) return json({ error: "Choose either a music link or an MP3 attachment." }, 400);
      let audio: Buffer | undefined;
      try { audio = parseMusicDataUrl(body.musicDataUrl); }
      catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid MP3." }, 400); }
      if (audio && (typeof body.musicName !== "string" || body.musicName.length > 160 || !body.musicName.toLowerCase().endsWith(".mp3"))) return json({ error: "Invalid MP3 filename." }, 400);
      const payload: SharePayload = { v: 1, createdAt, expiresAt, note: { title: note.title, message: note.message, asciiArt: note.asciiArt, ...(note.photoDataUrl ? { photoDataUrl: note.photoDataUrl } : {}), ...(note.externalMusic ? { externalMusic: note.externalMusic } : {}) }, appearance: { typingSpeedMs: appearance.typingSpeedMs, backgroundColor: appearance.backgroundColor, flyingIcon: appearance.flyingIcon, flyingColor: appearance.flyingColor } };
      const preliminary = encryptShare(payload, body.password, body.accessSalt);
      if (preliminary.length > 24_500) return json({ error: "This note is too large for link sharing. Try a shorter message or smaller picture." }, 413);
      let musicPath: string | undefined;
      try {
        if (audio) {
          musicPath = await storeMusic(audio, expiresAt);
          payload.note.music = { pathname: musicPath, name: body.musicName };
        }
        const token = encryptShare(payload, body.password, body.accessSalt);
        if (token.length > 25_000) throw new Error("This note is too large for link sharing.");
        const id = await storeSharedToken(token, expiresAt);
        return json({ id, expiresAt });
      } catch (error) {
        if (musicPath) await deleteMusic(musicPath).catch(() => {});
        return json({ error: error instanceof Error && (error.message.startsWith("Music sharing needs") || error.message.startsWith("Short links need")) ? error.message : "Could not create a short link. Check private Blob access, deployment credentials, and available storage." }, 400);
      }
    }
    if (body.action === "unlock") {
      if (!isString(body.token, 25_000) || !isString(body.password, 256) || !isString(body.accessSalt, 128)) return json({ error: "Invalid credentials or share link." }, 400);
      try { const encryptedToken = await resolveSharedToken(body.token); return json({ payload: decryptShare(encryptedToken, body.password, body.accessSalt) }); }
      catch { return json({ error: "Unable to unlock. Check your password and salt, or the link may have expired." }, 403); }
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Invalid JSON request." }, 400);
    // Misconfiguration is returned as an error without exposing private keys.
    if (error instanceof Error && error.message.startsWith("Sharing is not configured")) return json({ error: "Sharing is not configured on this deployment." }, 503);
    return json({ error: "Could not process this request." }, 500);
  }
}
