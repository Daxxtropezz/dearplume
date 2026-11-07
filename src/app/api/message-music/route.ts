import { decryptShare } from "@/lib/messageShareCrypto";
import { readMusic } from "@/lib/musicStorage";
import { isSafeMusicPath } from "@/types/share";
import { resolveSharedToken } from "@/lib/shareStorage";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Content-Security-Policy": "default-src 'none'", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 35_000) return Response.json({ error: "Invalid request." }, { status: 413, headers });
    const raw = await request.text();
    if (raw.length > 35_000) return Response.json({ error: "Invalid request." }, { status: 413, headers });
    const body = JSON.parse(raw);
    if (typeof body.token !== "string" || typeof body.password !== "string" || typeof body.accessSalt !== "string" || body.password.length > 256 || body.accessSalt.length > 128) throw new Error("Bad credentials.");
    const encryptedToken = await resolveSharedToken(body.token);
    const share = decryptShare(encryptedToken, body.password, body.accessSalt);
    if (!share.note.music || !isSafeMusicPath(share.note.music.pathname)) return Response.json({ error: "No music attached." }, { status: 404, headers });
    const audio = await readMusic(share.note.music.pathname);
    return new Response(new Uint8Array(audio), { status: 200, headers: { ...headers, "Content-Type": "audio/mpeg", "Content-Length": String(audio.length), "Content-Disposition": "inline" } });
  } catch { return Response.json({ error: "Music unavailable. Check the share link and credentials, or it may have expired." }, { status: 403, headers }); }
}
