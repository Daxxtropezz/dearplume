import type { SharedAppearance } from "./settings";
import type { ExternalMusic } from "@/lib/externalMusic";

export const MAX_SHARED_PHOTO_DATA_URL_LENGTH = 12_000;

/** Only canvas-produced raster images may be embedded in shared notes. */
export function isSharedPhotoDataUrl(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= MAX_SHARED_PHOTO_DATA_URL_LENGTH &&
    /^data:image\/(?:webp|jpeg);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}

/** Never accept arbitrary pathnames when loading private media. */
export function isSafeMusicPath(value: unknown): value is string {
  return typeof value === "string" && /^dearplume\/music\/\d{13}\/[a-f0-9]{32}\.bin$/.test(value);
}
export type SharedMessage = {
  title: string;
  message: string;
  asciiArt: string;
  /** Compressed, downscaled copy used only for the post-typing color reveal. */
  photoDataUrl?: string;
  /** Server-side pathname of an encrypted, private music blob (new shares only). */
  music?: { pathname: string; name: string };
  /** External provider and track ID only; never raw embed HTML. */
  externalMusic?: ExternalMusic;
};

export type SharePayload = {
  v: 1;
  createdAt: number;
  expiresAt: number;
  note: SharedMessage;
  appearance: SharedAppearance;
};

export type SharedCredentials = {
  url: string;
  password: string;
  accessSalt: string;
  expiresAt: number;
  title: string;
};
