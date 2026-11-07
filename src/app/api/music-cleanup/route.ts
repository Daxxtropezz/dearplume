import { timingSafeEqual } from "node:crypto";
import { purgeExpiredMusic } from "@/lib/musicStorage";
import { purgeExpiredShares } from "@/lib/shareStorage";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const providedBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected || "");
  if (!expected || providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const musicDeleted = await purgeExpiredMusic();
    const sharesDeleted = await purgeExpiredShares();
    return Response.json({ deleted: musicDeleted + sharesDeleted, musicDeleted, sharesDeleted }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Expired media or share cleanup failed." }, { status: 500 }); }
}
