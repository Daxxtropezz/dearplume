"use client";

import { useState } from "react";
import { ExternalLink, Music2, Play } from "lucide-react";
import type { ExternalMusic } from "@/lib/externalMusic";
import { externalMusicEmbedUrl, externalMusicLabel, originalMusicUrl } from "@/lib/externalMusic";

type Props = { music: ExternalMusic; compact?: boolean };

/** Requires an explicit choice before loading third-party content. */
export default function ExternalMusicPlayer({ music, compact = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const provider = externalMusicLabel(music);
  return (
    <section className={`external-music-player${compact ? " compact" : ""}`} aria-label={`${provider} background music`}>
      <div className="external-music-title"><Music2 size={17} /> <span>{provider} background music</span></div>
      {!loaded ? (
        <div className="external-music-gate">
          <p>Listen while reading. Loading this player connects your browser to {provider}.</p>
          <button className="button secondary mini" type="button" onClick={() => setLoaded(true)}><Play size={15} /> Load {provider} player</button>
        </div>
      ) : (
        <>
          <iframe
            className={music.provider === "youtube" ? "youtube-embed" : "spotify-embed"}
            src={externalMusicEmbedUrl(music)}
            title={`${provider} music player`}
            loading="lazy"
            allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <p className="external-music-hint">Press Play inside the player to start the soundtrack. Playback and availability depend on {provider}.</p>
        </>
      )}
      <a className="external-music-source" href={originalMusicUrl(music)} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open on {provider}</a>
    </section>
  );
}
