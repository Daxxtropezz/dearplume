import "server-only";
import { put, get, del, list } from "@vercel/blob";
import { randomBytes } from "node:crypto";

/** Opaque references resolve to encrypted tokens, never plaintext note data. */
const PREFIX = "dearplume/shares/";
const MAX_TOKEN_LENGTH = 25_000;
// Expiration is public metadata; the random 144-bit ID cannot be guessed.
const ID_PATTERN = /^r_(\d{13})_([A-Za-z0-9_-]{24})$/;

export function isShareReference(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function sharePath(reference: string): string {
  const match = ID_PATTERN.exec(reference);
  if (!match) throw new Error("Invalid share reference.");
  return `${PREFIX}${match[1]}/${match[2]}.txt`;
}

function hasPrivateBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function storeSharedToken(token: string, expiresAt: number): Promise<string> {
  if (!hasPrivateBlob()) throw new Error("Short links need a connected private Vercel Blob store. Configure its credentials in this environment.");
  if (token.length < 40 || token.length > MAX_TOKEN_LENGTH || !Number.isSafeInteger(expiresAt)) throw new Error("Invalid encrypted share.");
  const reference = `r_${expiresAt}_${randomBytes(18).toString("base64url")}`;
  await put(sharePath(reference), token, {
    access: "private",
    addRandomSuffix: false,
    contentType: "text/plain; charset=utf-8",
  });
  return reference;
}

/** Existing full ciphertext tokens continue to work without Blob lookup. */
export async function resolveSharedToken(referenceOrToken: string): Promise<string> {
  if (!isShareReference(referenceOrToken)) return referenceOrToken;
  const match = ID_PATTERN.exec(referenceOrToken)!;
  if (Number(match[1]) <= Date.now()) throw new Error("Share expired.");
  if (!hasPrivateBlob()) throw new Error("Short links require private Blob storage.");
  const result = await get(sharePath(referenceOrToken), { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream || result.blob.size > MAX_TOKEN_LENGTH) throw new Error("Share unavailable.");
  const token = await new Response(result.stream).text();
  if (token.length < 40 || token.length > MAX_TOKEN_LENGTH) throw new Error("Share unavailable.");
  return token;
}

/** Delete one encrypted blob if creation fails after it has been written. */
export async function deleteSharedToken(reference: string): Promise<void> {
  if (isShareReference(reference)) await del(sharePath(reference));
}

/** Daily cleanup removes expired ciphertext. Expiration is checked at unlock regardless. */
export async function purgeExpiredShares(): Promise<number> {
  let cursor: string | undefined;
  let removed = 0;
  for (let page = 0; page < 100; page++) {
    const result = await list({ prefix: PREFIX, cursor, limit: 1000 });
    const expired = result.blobs.filter((blob) => {
      const match = /^dearplume\/shares\/(\d{13})\/[A-Za-z0-9_-]{24}\.txt$/.exec(blob.pathname);
      return match && Number(match[1]) <= Date.now();
    });
    if (expired.length) { await del(expired.map((blob) => blob.pathname)); removed += expired.length; }
    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }
  return removed;
}
