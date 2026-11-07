/** A link is a reference only. Dearplume never downloads or extracts provider audio. */
export type ExternalMusic = { provider: "youtube" | "spotify"; id: string };
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

export function isExternalMusic(value: unknown): value is ExternalMusic {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  // Only provider + ID are accepted, not arbitrary HTML or embed URLs.
  if (Object.keys(record).some((key) => !["provider", "id"].includes(key))) return false;
  return (record.provider === "youtube" && typeof record.id === "string" && YOUTUBE_ID.test(record.id)) ||
    (record.provider === "spotify" && typeof record.id === "string" && SPOTIFY_ID.test(record.id));
}

/** Accept only known official hostnames/paths (including the URLs in the request). */
export function parseExternalMusicLink(raw: string): ExternalMusic | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let candidate: ExternalMusic | null = null;
    if (["youtu.be", "www.youtu.be"].includes(host)) {
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length === 1) candidate = { provider: "youtube", id: segments[0] };
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      const segments = url.pathname.split("/").filter(Boolean);
      if (url.pathname === "/watch") candidate = { provider: "youtube", id: url.searchParams.get("v") || "" };
      else if (segments.length === 2 && ["shorts", "embed", "live"].includes(segments[0])) candidate = { provider: "youtube", id: segments[1] };
    } else if (host === "open.spotify.com") {
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length === 2 && segments[0] === "track") candidate = { provider: "spotify", id: segments[1] };
    }
    return isExternalMusic(candidate) ? candidate : null;
  } catch { return null; }
}

export function originalMusicUrl(music: ExternalMusic): string {
  return music.provider === "youtube" ? `https://www.youtube.com/watch?v=${music.id}` : `https://open.spotify.com/track/${music.id}`;
}

export function externalMusicEmbedUrl(music: ExternalMusic): string {
  return music.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${music.id}?rel=0&playsinline=1`
    : `https://open.spotify.com/embed/track/${music.id}`;
}

export function externalMusicLabel(music: ExternalMusic): string {
  return music.provider === "youtube" ? "YouTube" : "Spotify";
}
