import { timingSafeEqual } from "node:crypto";
import { purgeExpiredMusic } from "@/lib/musicStorage";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const providedBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected || "");
  if (!expected || providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try { return Response.json({ deleted: await purgeExpiredMusic() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Music cleanup failed." }, { status: 500 }); }
}
