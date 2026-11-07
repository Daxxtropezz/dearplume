/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Heart, KeyRound, LockKeyhole, RefreshCcw, Send, ShieldCheck, Sparkles, Music2 } from "lucide-react";
import type { SharePayload } from "@/types/share";
import { DEFAULT_SETTINGS, formatDate } from "@/lib/defaults";
import FlyingBackground from "./FlyingBackground";
import ExternalMusicPlayer from "./ExternalMusicPlayer";
import { themeStyle } from "@/lib/theme";

export default function SharedMessageView() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [salt, setSalt] = useState("");
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [shownCharacters, setShownCharacters] = useState(0);
  const [animationCycle, setAnimationCycle] = useState(0);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicError, setMusicError] = useState("");
  const [musicLoading, setMusicLoading] = useState(false);

  useEffect(() => {
    const readFragment = () => setToken(window.location.hash.replace(/^#/, ""));
    readFragment();
    window.addEventListener("hashchange", readFragment);
    return () => window.removeEventListener("hashchange", readFragment);
  }, []);

  useEffect(() => {
    if (!payload) return;
    const interval = window.setInterval(() => setShownCharacters((shown) => {
      if (shown >= payload.note.message.length) {
        window.clearInterval(interval);
        return shown;
      }
      return shown + 1;
    }), payload.appearance.typingSpeedMs);
    return () => window.clearInterval(interval);
  }, [payload, animationCycle]);

  useEffect(() => { return () => { if (musicUrl) URL.revokeObjectURL(musicUrl); }; }, [musicUrl]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/message-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ action: "unlock", token, password, accessSalt: salt.trim() }),
      });
      const result: { payload?: SharePayload; error?: string } = await response.json();
      if (!response.ok || !result.payload) throw new Error(result.error || "Unable to unlock this note.");
      setShownCharacters(0);
      setPayload(result.payload);
      setMusicUrl("");
      setMusicError("");
      if (result.payload.note.music) {
        setMusicLoading(true);
        try {
          const responseAudio = await fetch("/api/message-music", {
            method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", referrerPolicy: "no-referrer",
            body: JSON.stringify({ token, password, accessSalt: salt.trim() }),
          });
          if (!responseAudio.ok) throw new Error("Could not load the attached soundtrack.");
          setMusicUrl(URL.createObjectURL(await responseAudio.blob()));
        } catch { setMusicError("The soundtrack could not load. You can still read the note."); }
        finally { setMusicLoading(false); }
      }
      setPassword("");
      setSalt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to unlock this note.");
    } finally {
      setIsLoading(false);
    }
  }

  const appearance = payload?.appearance || DEFAULT_SETTINGS;
  const complete = payload ? shownCharacters >= payload.note.message.length : false;
  const hasColorPhoto = Boolean(payload?.note.photoDataUrl);
  const photoRevealed = complete && hasColorPhoto;

  return (
    <main className="site-shell recipient-shell" style={themeStyle(appearance.backgroundColor, appearance.flyingColor) as CSSProperties}>
      <FlyingBackground appearance={appearance} />
      <div className="recipient-layout">
        <header className="recipient-header">
          <Link className="recipient-brand" href="/"><Heart size={24} fill="currentColor" /> dearplume<span>✳</span></Link>
          <span><ShieldCheck size={14} /> a private little delivery</span>
        </header>

        {!payload ? (
          <section className="unlock-card">
            <div className="envelope-illustration">
              <span className="envelope-back">♡</span>
              <div className="envelope-front"><LockKeyhole size={32} /></div>
              <span className="floating-twinkle twinkle-one">✳</span>
              <span className="floating-twinkle twinkle-two">✦</span>
            </div>
            <span className="eyebrow">SOMETHING SPECIAL IS WAITING</span>
            <h1>Someone left you<br /><em>a little note.</em></h1>
            <p>Only you and someone with the right secret words can open it.</p>
            {token ? (
              <form className="unlock-form" onSubmit={unlock}>
                <label htmlFor="unlock-password">Your password</label>
                <div className="unlock-input-wrapper"><KeyRound size={17} /><input id="unlock-password" autoComplete="off" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Type your secret password" minLength={12} required /></div>
                <label htmlFor="unlock-salt">Your access salt</label>
                <div className="unlock-input-wrapper"><Sparkles size={17} /><input id="unlock-salt" autoComplete="off" type="text" value={salt} onChange={(event) => setSalt(event.target.value)} placeholder="Paste your access salt" required /></div>
                {error && <p className="error-message" role="alert">{error}</p>}
                <button className="button primary full-width" type="submit" disabled={isLoading}><LockKeyhole size={17} /> {isLoading ? "Opening your note..." : "Unlock my little note"}</button>
              </form>
            ) : (
              <div className="error-message">This link is missing its share reference. Ask the sender for the full link.</div>
            )}
            <Link href="/" className="back-link"><ArrowLeft size={15} /> Make a note of your own</Link>
          </section>
        ) : (
          <section className="shared-note-wrap">
            <div className="note-opened-badge"><Check size={16} /> UNLOCKED WITH LOVE</div>
            <h1>Just for you <span>♡</span></h1>
            <div className="shared-paper">
              <div className="paper-tape" />
              <div className="paper-sparkle">✳</div>
              {payload.note.asciiArt && (
                <div className={`ascii-art-frame${photoRevealed ? " photo-revealed" : ""}`}>
                  <div className="ascii-top">
                    <span>{photoRevealed ? "your picture, in full color" : "your little picture, in letters"}</span>
                    <span>{photoRevealed ? "♡ ORIGINAL MEMORY" : "♡ ASCII MEMORY"}</span>
                  </div>
                  <div className="ascii-visual-frame">
                    <pre role="img" aria-label="Photo represented as ASCII characters" aria-hidden={photoRevealed}>{payload.note.asciiArt}</pre>
                    {payload.note.photoDataUrl && (
                      <img
                        className="shared-color-photo"
                        src={payload.note.photoDataUrl}
                        alt="Shared picture revealed in color after the message finishes"
                        aria-hidden={!photoRevealed}
                      />
                    )}
                  </div>
                </div>
              )}
              {payload.note.externalMusic && <ExternalMusicPlayer music={payload.note.externalMusic} autoStart /> }
              {payload.note.music && <div className="recipient-music"><div className="recipient-music-label"><Music2 size={17}/><span>Your little soundtrack: {payload.note.music.name}</span></div>{musicLoading ? <p>Preparing your music...</p> : musicUrl ? <audio controls loop preload="metadata" src={musicUrl} onLoadedMetadata={(event) => { event.currentTarget.volume = 0.5; }} aria-label="Background music — press play when ready"/> : <p>{musicError || "Soundtrack not available."}</p>}<small>Press play to listen while you read. Music loops until you pause it.</small></div>}
              <span className="eyebrow">A LITTLE SOMETHING TO REMEMBER</span>
              <h2>{payload.note.title}</h2>
              <p className="typed-message">{payload.note.message.slice(0, shownCharacters)}{!complete && <span className="typing-cursor" aria-hidden="true">|</span>}</p>
              <div className="shared-paper-footer">sent with a little courage &amp; a lot of ♡</div>
            </div>
            <div className="typing-controls">
              <span>{complete ? "The whole message is yours ♡" : "A little story is unfolding..."}</span>
              <div>
                {!complete && <button className="button secondary mini" onClick={() => setShownCharacters(payload.note.message.length)}>Show all</button>}
                <button className="button secondary mini" onClick={() => { setShownCharacters(0); setAnimationCycle((cycle) => cycle + 1); }}><RefreshCcw size={14} /> Replay</button>
              </div>
            </div>
            <p className="shared-expiration">This link expires {formatDate(payload.expiresAt)} (PHT). Saving this page or a screenshot is still possible.</p>
            <Link className="button primary make-your-own" href="/"><Send size={16} /> Write your own little note</Link>
          </section>
        )}
        <footer className="recipient-footer">Dearplume ♡ only shared with those who have the key.</footer>
      </div>
    </main>
  );
}
