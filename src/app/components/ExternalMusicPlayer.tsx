"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Music2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { ExternalMusic } from "@/lib/externalMusic";
import { externalMusicEmbedUrl, externalMusicLabel, originalMusicUrl } from "@/lib/externalMusic";

type Props = { music: ExternalMusic; compact?: boolean; autoStart?: boolean };
type YouTubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  destroy(): void;
};
type YouTubeAPI = {
  Player: new (element: HTMLElement, options: {
    width: string;
    height: string;
    videoId: string;
    playerVars: Record<string, number | string>;
    events: {
      onReady: (event: { target: YouTubePlayer }) => void;
      onStateChange: (event: { data: number }) => void;
      onError: () => void;
    };
  }) => YouTubePlayer;
};
type YouTubeWindow = Window & { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void };
let pendingYoutubeApi: Promise<YouTubeAPI> | null = null;
function loadYoutubeApi(): Promise<YouTubeAPI> {
  const win = window as YouTubeWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (pendingYoutubeApi) return pendingYoutubeApi;
  pendingYoutubeApi = new Promise<YouTubeAPI>((resolve, reject) => {
    const timeout = window.setTimeout(() => { pendingYoutubeApi = null; reject(new Error("YouTube player timed out.")); }, 15_000);
    const previousReady = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeout);
      if (win.YT?.Player) resolve(win.YT);
      else { pendingYoutubeApi = null; reject(new Error("YouTube player unavailable.")); }
    };
    if (!document.querySelector('script[data-dearplume-youtube="1"]')) {
      const script = document.createElement("script");
      script.dataset.dearplumeYoutube = "1";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => { window.clearTimeout(timeout); pendingYoutubeApi = null; reject(new Error("Could not load YouTube.")); };
      document.head.appendChild(script);
    }
  });
  return pendingYoutubeApi;
}

/** Official embedded players only. YouTube's video viewport must remain visible.
 * The toolbar provides controls without covering YouTube's own player UI. */
export default function ExternalMusicPlayer({ music, compact = false, autoStart = false }: Props) {
  const [loaded, setLoaded] = useState(autoStart);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [playerError, setPlayerError] = useState("");
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const provider = externalMusicLabel(music);

  useEffect(() => {
    if (!loaded || music.provider !== "youtube") return;
    let cancelled = false;
    loadYoutubeApi().then((api) => {
      if (cancelled || !hostRef.current) return;
      const player = new api.Player(hostRef.current, {
        width: "280", height: "200", videoId: music.id,
        playerVars: { playsinline: 1, controls: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: ({ target }) => {
            if (cancelled) return;
            target.setVolume(volume);
            setReady(true);
            // YouTube only permits auto playback when over half the player is
            // visible. A browser can still block playback with sound.
            const iframe = containerRef.current?.querySelector("iframe");
            if (iframe && typeof IntersectionObserver !== "undefined") {
              const observer = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.intersectionRatio > 0.5)) {
                  observer.disconnect();
                  target.playVideo();
                }
              }, { threshold: [0.51] });
              observerRef.current = observer;
              observer.observe(iframe);
            }
          },
          onStateChange: ({ data }) => { if (!cancelled) setPlaying(data === 1); },
          onError: () => { if (!cancelled) setPlayerError("This video cannot play here. Try Open on YouTube."); },
        },
      });
      playerRef.current = player;
    }).catch(() => { if (!cancelled) setPlayerError("Couldn't load the player. Try Open on YouTube."); });
    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      observerRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // Volume is set through an interaction below; don't reset the player on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, music.provider, music.id]);

  function togglePlayback() {
    const player = playerRef.current;
    if (!player || !ready) return;
    if (playing) player.pauseVideo(); else player.playVideo();
  }
  function changeVolume(next: number) {
    setVolume(next);
    playerRef.current?.setVolume(next);
  }

  return (
    <section className={`external-music-player${compact ? " compact" : ""}`} aria-label={`${provider} background music`}>
      <div className="external-music-title"><Music2 size={17} /> <span>{provider} background music</span></div>
      {!loaded ? (
        <div className="external-music-gate">
          <button className="button secondary mini" type="button" onClick={() => setLoaded(true)}><Play size={15} /> Play {provider} music</button>
          <p>Starts a connection to {provider}. Sound may require a second tap because of your browser settings.</p>
        </div>
      ) : music.provider === "youtube" ? (
        <div className="external-music-body">
          <div className="external-music-toolbar">
            <button type="button" className="button secondary mini" onClick={togglePlayback} disabled={!ready} aria-label={playing ? "Pause YouTube music" : "Play YouTube music"}>
              {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? "Pause" : "Play"}
            </button>
            <label className="external-volume-label" htmlFor={`youtube-volume-${music.id}`}>
              {volume ? <Volume2 size={17} /> : <VolumeX size={17} />}
              <input id={`youtube-volume-${music.id}`} aria-label="YouTube volume" type="range" min="0" max="100" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} disabled={!ready}/>
              <span>{volume}%</span>
            </label>
          </div>
          <div className="youtube-small-viewport" ref={containerRef} aria-label="YouTube video player"><div ref={hostRef} /></div>
          {playerError && <p className="external-music-hint" role="alert">{playerError}</p>}
          <p className="external-music-hint">YouTube requires a visible video player. Its playback may need a tap on the video.</p>
        </div>
      ) : (
        <div className="external-music-body">
          <iframe className="spotify-embed" src={externalMusicEmbedUrl(music)} title="Spotify music player" loading="lazy" allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          <p className="external-music-hint">Use Spotify&apos;s player controls. Playback length and availability depend on Spotify.</p>
        </div>
      )}
      <a className="external-music-source" href={originalMusicUrl(music)} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open on {provider}</a>
    </section>
  );
}
