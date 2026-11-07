/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, BookHeart, Check, ChevronRight, Clock3, Copy, Download, Eye, FileDown, Flower2, Heart, ImagePlus, Music2, KeyRound, LockKeyhole, Pencil, Plus, RefreshCcw, Send, Settings2, ShieldCheck, Sparkles, Trash2, Upload, WandSparkles, X } from "lucide-react";
import FlyingBackground, { DECORATIONS } from "./FlyingBackground";
import ExternalMusicPlayer from "./ExternalMusicPlayer";
import { externalMusicLabel, originalMusicUrl, parseExternalMusicLink } from "@/lib/externalMusic";
import Modal from "./Modal";
import type { Message } from "@/types/message";
import type { SharedCredentials } from "@/types/share";
import type { AppSettings, FlyingIconName, ShareUnit } from "@/types/settings";
import { FLYING_ICONS } from "@/types/settings";
import { DEFAULT_SETTINGS, SETTINGS_KEY, durationMs, formatDate, loadSettings, saveSettings } from "@/lib/defaults";
import { clearMessages, exportBackup, importBackup, listMessages, purgeExpiredMessages, putMessage, removeMessage } from "@/lib/localMessages";
import { photoToAscii, photoToSharedPreview } from "@/lib/ascii";
import { downloadText } from "@/lib/download";
import { shareToMarkdown } from "@/lib/shareMarkdown";
import { themeStyle } from "@/lib/theme";

type Tab = "compose" | "created";
type ConfirmAction = { kind: "delete"; id: string } | { kind: "clear" };

function randomString(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, bytes * 2);
}
function prettyNumber(value: number) { return value === 1 ? "1 note" : `${value} notes`; }

export default function DearplumeApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<Tab>("compose");
  const [notes, setNotes] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [draftPhoto, setDraftPhoto] = useState<File | null | undefined>(undefined);
  const [draftMusic, setDraftMusic] = useState<File | null | undefined>(undefined);
  const [draftMusicLink, setDraftMusicLink] = useState("");
  const [musicMode, setMusicMode] = useState<"link" | "mp3">("link");
  const [draftPhotoUrl, setDraftPhotoUrl] = useState("");
  const [draftMusicUrl, setDraftMusicUrl] = useState("");
  const [musicUrls, setMusicUrls] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [shareSalt, setShareSalt] = useState("");
  const [shareValue, setShareValue] = useState(24);
  const [shareUnit, setShareUnit] = useState<ShareUnit>("hours");
  const [credentials, setCredentials] = useState<SharedCredentials | null>(null);
  const [shareError, setShareError] = useState("");
  const [asciiPreview, setAsciiPreview] = useState("");

  const reload = useCallback(async () => { setNotes(await listMessages()); }, []);

  useEffect(() => {
    let active = true;
    const initial = loadSettings();
    // Hydration uses DEFAULT_SETTINGS, then applies browser settings after
    // the asynchronous local-storage/IndexedDB initialization finishes.
    purgeExpiredMessages(initial)
      .then(() => listMessages())
      .then((rows) => { if (active) setNotes(rows); })
      .catch(() => { if (active) setFeedback("Browser storage is unavailable. Try a normal browser window."); })
      .finally(() => {
        if (active) {
          setSettings(initial);
          setSettingsDraft(initial);
          setLoaded(true);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try { const deleted = await purgeExpiredMessages(settings); if (deleted) await reload(); }
      catch { /* Storage warnings are presented when performing a user action. */ }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [settings, reload]);

  useEffect(() => {
    const urls: Record<string, string> = {};
    notes.forEach((note) => { if (note.photo) urls[note.id] = URL.createObjectURL(note.photo); });
    // Object URLs are browser resources: publish them after they are created,
    // and always cancel/revoke them when the note list changes or unmounts.
    const timer = window.setTimeout(() => setPhotoUrls(urls), 0);
    return () => {
      window.clearTimeout(timer);
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [notes]);

  useEffect(() => {
    const url = draftPhoto ? URL.createObjectURL(draftPhoto) : "";
    const timer = window.setTimeout(() => setDraftPhotoUrl(url), 0);
    return () => { window.clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
  }, [draftPhoto]);

  useEffect(() => {
    const urls: Record<string, string> = {};
    notes.forEach((note) => { if (note.music) urls[note.id] = URL.createObjectURL(note.music); });
    const timer = window.setTimeout(() => setMusicUrls(urls), 0);
    return () => {
      window.clearTimeout(timer);
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [notes]);

  useEffect(() => {
    const url = draftMusic ? URL.createObjectURL(draftMusic) : "";
    const timer = window.setTimeout(() => setDraftMusicUrl(url), 0);
    return () => { window.clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
  }, [draftMusic]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 4300);
    return () => clearTimeout(timer);
  }, [feedback]);

  const openNote = notes.find((note) => note.id === openId);
  const shareNote = notes.find((note) => note.id === shareId);
  const editingNote = notes.find((note) => note.id === editingId);
  const appearance = useMemo(() => ({ backgroundColor: settings.backgroundColor, flyingColor: settings.flyingColor, flyingIcon: settings.flyingIcon, typingSpeedMs: settings.typingSpeedMs, messagePlacement: settings.messagePlacement, musicPlacement: settings.musicPlacement }), [settings]);
  const previewUrl = draftPhoto === null ? "" : draftPhotoUrl || (editingId ? photoUrls[editingId] : "");
  const musicPreviewUrl = draftMusic === null ? "" : draftMusicUrl || (editingId ? musicUrls[editingId] : "");

  function resetComposer() { setEditingId(null); setDraftTitle(""); setDraftMessage(""); setDraftPhoto(undefined); setDraftMusic(undefined); setDraftMusicLink(""); setMusicMode("link"); }
  function startEditing(note: Message) {
    setEditingId(note.id); setDraftTitle(note.title); setDraftMessage(note.message); setDraftPhoto(undefined); setDraftMusic(undefined); setDraftMusicLink(note.musicLink || ""); setMusicMode(note.music && !note.musicLink ? "mp3" : "link"); setOpenId(null); setTab("compose");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draftTitle.trim(); const message = draftMessage.trim();
    if (!title || !message) return setFeedback("Please add a title and a message.");
    if (notes.length >= 500 && !editingNote) return setFeedback("You reached the 500-note local limit.");
    const parsedMusic = musicMode === "link" && draftMusicLink.trim() ? parseExternalMusicLink(draftMusicLink) : null;
    if (musicMode === "link" && draftMusicLink.trim() && !parsedMusic) return setFeedback("Paste a valid YouTube video or Spotify track link.");
    setBusy(true);
    try {
      const now = Date.now();
      await putMessage({ id: editingId || crypto.randomUUID(), title, message, createdAt: editingNote?.createdAt || now, updatedAt: now, photo: draftPhoto === undefined ? editingNote?.photo : draftPhoto || undefined,
        music: musicMode === "mp3" ? (draftMusic === undefined ? editingNote?.music : draftMusic || undefined) : undefined,
        musicName: musicMode === "mp3" ? (draftMusic === undefined ? editingNote?.musicName : draftMusic?.name) : undefined,
        musicLink: parsedMusic ? originalMusicUrl(parsedMusic) : undefined });
      await reload(); resetComposer(); setTab("created"); setFeedback(editingId ? "Your note was updated." : "A new little note was saved on this device.");
    } catch { setFeedback("Could not save. Check your browser storage space."); }
    finally { setBusy(false); }
  }
  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return setFeedback("Choose a JPG, PNG, WebP, or GIF picture.");
    if (file.size > 6_000_000) return setFeedback("Choose a picture smaller than 6 MB.");
    setDraftPhoto(file);
  }
  function onMusicChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".mp3") || (file.type && !["audio/mpeg", "audio/mp3", "audio/x-mpeg"].includes(file.type))) return setFeedback("Choose an MP3 audio file.");
    if (file.size > 2_000_000) return setFeedback("Choose an MP3 smaller than 2 MB. Compress or trim longer songs first.");
    setDraftMusic(file);
  }
  function blobToAudioDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]+;base64,/, "data:audio/mpeg;base64,"));
      reader.onerror = () => reject(new Error("Could not read the MP3."));
      reader.readAsDataURL(blob);
    });
  }
  async function confirmDelete() {
    if (!confirmAction) return;
    try {
      if (confirmAction.kind === "clear") { await clearMessages(); localStorage.removeItem(SETTINGS_KEY); const fresh = { ...DEFAULT_SETTINGS }; setSettings(fresh); setSettingsDraft(fresh); setFeedback("Local notes and preferences were cleared."); setTab("compose"); resetComposer(); }
      else { await removeMessage(confirmAction.id); setFeedback("Your note was deleted."); if (editingId === confirmAction.id) resetComposer(); }
      setOpenId(null); await reload();
    } catch { setFeedback("Could not update local storage."); }
    finally { setConfirmAction(null); }
  }
  function openShare(note: Message) {
    setOpenId(null); setShareId(note.id); setSharePassword(""); setShareSalt(randomString(16)); setShareValue(settings.shareRetention.value); setShareUnit(settings.shareRetention.unit);
    setCredentials(null); setShareError(""); setAsciiPreview("");
  }
  async function generateShare() {
    if (!shareNote) return;
    if (sharePassword.length < 12) return setShareError("Use at least 12 characters, or generate a password.");
    if (!Number.isInteger(shareValue) || shareValue < 1 || shareValue > 365 || durationMs(shareValue, shareUnit) > durationMs(90, "days")) return setShareError("Choose a whole-number duration of at most 90 days.");
    setShareBusy(true); setShareError("");
    try {
      const asciiArt = shareNote.photo ? await photoToAscii(shareNote.photo) : "";
      const photoDataUrl = shareNote.photo ? await photoToSharedPreview(shareNote.photo) : undefined;
      const musicDataUrl = shareNote.music && !shareNote.musicLink ? await blobToAudioDataUrl(shareNote.music) : undefined;
      const externalMusic = shareNote.musicLink ? parseExternalMusicLink(shareNote.musicLink) : null;
      if (shareNote.musicLink && !externalMusic) throw new Error("The saved music link is invalid. Edit the note and paste a new link.");
      setAsciiPreview(asciiArt);
      const response = await fetch("/api/message-share", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", referrerPolicy: "no-referrer", body: JSON.stringify({ action: "create", note: { title: shareNote.title, message: shareNote.message, asciiArt, photoDataUrl, ...(externalMusic ? { externalMusic } : {}) }, ...(musicDataUrl ? { musicDataUrl, musicName: shareNote.musicName || "Attached music.mp3" } : {}), appearance, duration: { value: shareValue, unit: shareUnit }, password: sharePassword, accessSalt: shareSalt }) });
      const result: { id?: string; expiresAt?: number; error?: string } = await response.json();
      if (!response.ok || !result.id || !result.expiresAt) throw new Error(result.error || "Could not generate short share link.");
      const data = { url: `${window.location.origin}/s#${result.id}`, password: sharePassword, accessSalt: shareSalt, expiresAt: result.expiresAt, title: shareNote.title };
      setCredentials(data);
      try { await navigator.clipboard.writeText(data.url); setFeedback("Protected link generated and copied."); }
      catch { setFeedback("Link generated. Use Copy link to copy it."); }
    } catch (error) { setShareError(error instanceof Error ? error.message : "Could not generate share link."); }
    finally { setShareBusy(false); }
  }
  async function copyValue(value: string, name: string) {
    try { await navigator.clipboard.writeText(value); setFeedback(`${name} copied.`); }
    catch { setFeedback("Clipboard unavailable. Open this site over HTTPS or localhost."); }
  }
  async function backup() {
    try { setBusy(true); const data = await exportBackup(notes); downloadText(data, `dearplume-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json"); setFeedback("Private backup downloaded. Keep it safe."); }
    catch { setFeedback("Could not export your notes."); }
    finally { setBusy(false); }
  }
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (file.size > 40_000_000) return setFeedback("Backup file is too large.");
    try { setBusy(true); const count = await importBackup(await file.text()); await reload(); setFeedback(`Imported ${prettyNumber(count)}. Matching IDs were replaced.`); if (count) setTab("created"); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Import failed."); }
    finally { setBusy(false); }
  }
  async function applySettings() {
    if (!Number.isInteger(settingsDraft.localRetention.value) || settingsDraft.localRetention.value < 1 || settingsDraft.localRetention.value > 365 || !Number.isInteger(settingsDraft.shareRetention.value) || settingsDraft.shareRetention.value < 1 || settingsDraft.shareRetention.value > 365) return setFeedback("Retention values must be whole numbers from 1 to 365.");
    if (durationMs(settingsDraft.shareRetention.value, settingsDraft.shareRetention.unit) > durationMs(90, "days")) return setFeedback("The shared link default cannot exceed 90 days.");
    saveSettings(settingsDraft); setSettings(settingsDraft); setShowSettings(false);
    try { const count = await purgeExpiredMessages(settingsDraft); await reload(); setFeedback(count ? `Settings saved. ${prettyNumber(count)} expired and were removed.` : "Your preferences were saved locally."); }
    catch { setFeedback("Preferences saved, but note cleanup failed."); }
  }

  return (
    <main className="site-shell" style={themeStyle(settings.backgroundColor, settings.flyingColor) as CSSProperties}>
      <FlyingBackground appearance={appearance} />
      <div className="site-inner">
        <header className="site-header">
          <div className="brand-group"><div className="logo-mark"><Flower2 size={27} strokeWidth={1.75} /></div><div><div className="brand-title">dearplume<span>✳</span></div><div className="brand-sub">words that feel like a warm hug</div></div></div>
          <span className="private-indicator"><LockKeyhole size={14} /> Private on your device</span>
        </header>

        <section className="intro-section">
          <div className="small-sticker"><Sparkles size={14} /> YOUR LITTLE CORNER OF AFFECTION</div>
          <h1>A little note,<br/><em>a lot of heart.</em> <span aria-hidden="true">♡</span></h1>
          <p>For someone special, your best friend, or that one person who makes your day. Make a note, add a picture, and send a little magic.</p>
        </section>

        <div className="tabs-bar" role="navigation" aria-label="Main sections">
          <div className="tab-group">
            <button className={`tab-button ${tab === "compose" ? "active" : ""}`} type="button" onClick={() => { if (tab !== "compose") { resetComposer(); setTab("compose"); } }}><Plus size={17} /> Create a note</button>
            {notes.length > 0 && <button className={`tab-button ${tab === "created" ? "active" : ""}`} type="button" onClick={() => setTab("created")}><BookHeart size={17} /> Created notes <span className="tab-count">{notes.length}</span></button>}
            <button className="settings-tab" type="button" onClick={() => { setSettingsDraft(structuredClone(settings)); setShowSettings(true); }} title="Preferences" aria-label="Open preferences"><Settings2 size={19} /></button>
          </div>
          <span className="tabs-hint"><ShieldCheck size={16} /> No login, no public gallery</span>
        </div>

        {!loaded ? <section className="empty-card">Opening your private little corner...</section> : tab === "compose" ? (
          <section className="composer-layout">
            <form className="panel-card composer-card" onSubmit={saveNote}>
              <div className="panel-heading"><div className="heading-icon"><Pencil size={20} /></div><div><span className="eyebrow">FROM THE HEART</span><h2>{editingId ? "Edit your little note" : "Write something sweet"}</h2></div></div>
              <div className="field-group"><label htmlFor="note-title">Give it a title <span>*</span></label><input id="note-title" className="text-input" maxLength={120} placeholder="e.g. For the person who makes me smile" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} required/><span className="field-hint">A little headline, just for them</span></div>
              <div className="field-group"><label htmlFor="note-message">Your message <span>*</span></label><textarea id="note-message" className="text-input message-input" rows={7} maxLength={5000} placeholder="Dear you, there's something I've been meaning to say..." value={draftMessage} onChange={(e) => setDraftMessage(e.target.value)} required/><span className="field-hint right-hint">{draftMessage.length} / 5,000</span></div>
              <div className="field-group"><label>Attach a favorite picture <span className="optional">optional</span></label><label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onPhotoChange} aria-label="Choose picture"/><ImagePlus size={23}/><strong>Click to choose a picture</strong><small>JPG, PNG, WebP or GIF • up to 6 MB</small></label>{previewUrl && <div className="photo-attached"><img src={previewUrl} alt="Selected picture preview"/><span>Picture attached <small>Only stored on this device</small></span><button className="icon-button" type="button" aria-label="Remove picture" onClick={() => setDraftPhoto(null)}><X size={18}/></button></div>}</div>
              <div className="field-group">
                <label>Background music <span className="optional">optional</span></label>
                <div className="music-source-tabs" role="group" aria-label="Music source">
                  <button className={`music-source-option ${musicMode === "link" ? "selected" : ""}`} type="button" aria-pressed={musicMode === "link"} onClick={() => setMusicMode("link")}>YouTube / Spotify link</button>
                  <button className={`music-source-option ${musicMode === "mp3" ? "selected" : ""}`} type="button" aria-pressed={musicMode === "mp3"} onClick={() => setMusicMode("mp3")}>Upload MP3</button>
                </div>
                {musicMode === "link" ? (
                  <>
                    <input className="text-input" type="url" value={draftMusicLink} onChange={(event) => setDraftMusicLink(event.target.value)} placeholder="https://youtu.be/... or https://open.spotify.com/track/..." aria-label="YouTube or Spotify music link" />
                    <span className="field-hint">Paste a public YouTube video or Spotify track URL. No MP3 download or Vercel Blob needed. Playback depends on the provider.</span>
                    {draftMusicLink.trim() && parseExternalMusicLink(draftMusicLink) && <ExternalMusicPlayer music={parseExternalMusicLink(draftMusicLink)!} compact />}
                    {draftMusicLink.trim() && !parseExternalMusicLink(draftMusicLink) && <span className="field-hint link-error">Use a supported YouTube video or Spotify track link.</span>}
                  </>
                ) : (
                  <>
                    <label className="upload-zone music-upload"><input type="file" accept=".mp3,audio/mpeg" onChange={onMusicChange} aria-label="Choose background MP3"/><Music2 size={22}/><strong>Choose an MP3 for your note</strong><small>MP3 only · up to 2 MB · saved locally until shared</small></label>
                    {musicPreviewUrl && <div className="music-attached"><div className="music-attachment-title"><Music2 size={17}/><span>{draftMusic?.name || editingNote?.musicName || "Your soundtrack"}</span><button className="icon-button" type="button" aria-label="Remove music" onClick={() => setDraftMusic(null)}><X size={17}/></button></div><audio controls preload="none" src={musicPreviewUrl} aria-label="Preview attached music"/></div>}
                    <span className="field-hint">Encrypted MP3 sharing requires Vercel Blob storage and @vercel/blob.</span>
                  </>
                )}
              </div>
              <div className="form-actions">{editingId && <button type="button" className="button secondary" onClick={resetComposer}>Cancel editing</button>}<button type="submit" className="button primary grow" disabled={busy}><Heart size={17} fill="currentColor"/> {busy ? "Saving..." : editingId ? "Save changes" : "Save this little note"} <ChevronRight size={17}/></button></div>
            </form>
            <aside className="preview-column"><div className="panel-card preview-panel"><div className="preview-topline"><span><Eye size={16}/> A LITTLE PREVIEW</span><span className="live-pill">LIVE</span></div><div className="preview-paper"><div className="paper-tape"/><div className="paper-sparkle">✳</div>{previewUrl ? <img className="paper-photo" src={previewUrl} alt="Picture for this note"/> : <div className="paper-placeholder"><Heart size={44} strokeWidth={1.25}/><span>a little space for your favorite moment</span></div>}<div className="paper-rule"/><h3>{draftTitle || "Your sweet title goes here"}</h3><p>{draftMessage || "Every lovely story starts with a few words..."}</p>{(musicMode === "link" ? Boolean(draftMusicLink.trim() && parseExternalMusicLink(draftMusicLink)) : Boolean(musicPreviewUrl)) && <div className="paper-music"><Music2 size={14}/> a little soundtrack attached</div>}<div className="paper-signoff">made with ♡ in dearplume</div></div><p className="preview-note">When shared, your picture starts as ASCII art and becomes a color photo when the message finishes typing.</p></div><div className="soft-tip"><Sparkles size={18}/><span>Every note lives privately in your browser until you choose to create a protected share link.</span></div></aside>
          </section>
        ) : (
          <section className="created-section"><div className="collection-title"><div><span className="eyebrow">YOUR SECRET LITTLE LIBRARY</span><h2>Notes you&apos;ve made <span>♡</span></h2><p>{prettyNumber(notes.length)} kept safely in this browser</p></div><button className="button secondary" type="button" onClick={() => { resetComposer(); setTab("compose"); }}><Plus size={16}/> New note</button></div><div className="notes-grid">{notes.map((note, index) => <article key={note.id} className="note-card"><div className={`note-card-image ${!note.photo ? "no-photo" : ""}`}>{photoUrls[note.id] ? <img src={photoUrls[note.id]} alt={`Photo attached to ${note.title}`}/> : <span>{index % 2 === 0 ? "♡" : "✳"}</span>}</div><div className="note-card-content"><span className="note-date"><Clock3 size={13}/> {formatDate(note.createdAt)} {(note.music || note.musicLink) && <Music2 size={14} aria-label="Music attached"/>}</span><h3>{note.title}</h3><p>{note.message}</p><div className="note-card-actions"><button className="button mini secondary" type="button" onClick={() => setOpenId(note.id)}><Eye size={15}/> View</button><button className="button mini primary" type="button" onClick={() => openShare(note)}><Send size={14}/> Share</button></div></div></article>)}</div></section>
        )}
        <footer className="site-footer"><span>Dearplume ♡ made for the people who matter.</span><span>Private by default · Share with care</span></footer>
      </div>

      {openNote && <Modal title={openNote.title} eyebrow="A NOTE FROM THE HEART" onClose={() => setOpenId(null)} wide><div className="view-note-layout">{photoUrls[openNote.id] && <img className="view-note-photo" src={photoUrls[openNote.id]} alt="Attached memory"/>}<div className="view-note-text">{openNote.message}</div>{openNote.musicLink && parseExternalMusicLink(openNote.musicLink) && <ExternalMusicPlayer music={parseExternalMusicLink(openNote.musicLink)!} compact />}{musicUrls[openNote.id] && <div className="music-attached"><div className="music-attachment-title"><Music2 size={17}/>{openNote.musicName || "Attached MP3"}</div><audio controls preload="none" src={musicUrls[openNote.id]} aria-label="Listen to attached music"/></div>}</div><p className="muted-small">Created {formatDate(openNote.createdAt)} · Updated {formatDate(openNote.updatedAt)}</p><div className="modal-actions stretch"><button className="button dangerous-ghost" type="button" onClick={() => setConfirmAction({ kind: "delete", id: openNote.id })}><Trash2 size={16}/> Delete</button><button className="button secondary" type="button" onClick={() => startEditing(openNote)}><Pencil size={16}/> Edit</button><button className="button primary" type="button" onClick={() => openShare(openNote)}><Send size={16}/> Share this note</button></div></Modal>}

      {shareNote && <Modal title="Send a little magic" eyebrow="PRIVATE ENCRYPTED SHARING" onClose={() => { if (!shareBusy) setShareId(null); }} wide><div className="share-explainer"><LockKeyhole size={19}/><div><strong>Just for someone special</strong><p>Only this note is shared. Your picture starts as ASCII, then reveals a compressed color copy after typing. That small copy is encrypted and stored as part of the shared snapshot in your private Vercel Blob store; your full-resolution photo stays on this device. The copied URL contains only a short reference. YouTube/Spotify songs are linked, not downloaded; the receiver chooses when to load the player. Uploaded MP3s are stored encrypted in private Blob too. Short-link sharing requires a connected private Blob store.</p></div></div>{shareNote.musicLink && parseExternalMusicLink(shareNote.musicLink) && <div className="music-share-notice"><Music2 size={17}/><span>{externalMusicLabel(parseExternalMusicLink(shareNote.musicLink)!)} link attached. No MP3 will be uploaded; the receiver can play it using the official embedded player.</span></div>}{shareNote.music && <div className="music-share-notice"><Music2 size={17}/><span>MP3 attached: {shareNote.musicName || "soundtrack"} · encrypted and uploaded privately when you generate this link.</span></div>}<div className="share-fields"><div className="field-group"><label htmlFor="share-duration">Link expires after</label><div className="inline-fields"><input id="share-duration" className="text-input" type="number" min="1" max="365" value={shareValue} onChange={(e) => { setShareValue(Number(e.target.value)); setCredentials(null); }}/><select className="text-input" value={shareUnit} onChange={(e) => { setShareUnit(e.target.value as ShareUnit); setCredentials(null); }}><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select></div><span className="field-hint">Maximum lifetime: 90 days. Separate from local note retention.</span></div><div className="field-group"><label htmlFor="share-password">Unlock password</label><div className="password-field"><input id="share-password" className="text-input" type="text" autoComplete="off" maxLength={256} placeholder="At least 12 characters" value={sharePassword} onChange={(e) => { setSharePassword(e.target.value); setCredentials(null); }}/><button type="button" className="inline-action" onClick={() => { setSharePassword(randomString(12)); setCredentials(null); }}><WandSparkles size={15}/> Generate</button></div></div><div className="field-group"><label>Auto-generated access salt</label><div className="password-field"><input className="text-input" readOnly value={shareSalt} aria-label="Access salt"/><button type="button" className="inline-action" onClick={() => { setShareSalt(randomString(16)); setCredentials(null); }} title="Generate a fresh salt"><RefreshCcw size={16}/> New</button></div><span className="field-hint">Your recipient needs both the password and this salt.</span></div></div>{shareError && <div className="error-message" role="alert">{shareError}</div>}{!credentials ? <button className="button primary full-width" type="button" disabled={shareBusy} onClick={generateShare}><LockKeyhole size={17}/> {shareBusy ? "Creating encrypted note..." : "Generate & copy protected link"}</button> : <div className="result-panel"><div className="result-title"><Check size={20}/> Your protected link is ready!</div><div className="copy-grid"><button type="button" className="button secondary" onClick={() => copyValue(credentials.url, "Link")}><Copy size={16}/> Copy link</button><button type="button" className="button secondary" onClick={() => copyValue(credentials.password, "Password")}><KeyRound size={16}/> Copy password</button><button type="button" className="button secondary" onClick={() => copyValue(credentials.accessSalt, "Salt")}><Copy size={16}/> Copy salt</button></div><div className="expires-text"><Clock3 size={14}/> Expires {formatDate(credentials.expiresAt)} (PHT)</div><button className="button download-button" type="button" onClick={() => downloadText(shareToMarkdown(credentials), `dearplume-${shareNote.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,45) || "note"}.md`, "text/markdown")}><FileDown size={17}/> Export sharing details as Markdown (.md)</button>{asciiPreview && <details className="ascii-details"><summary>Preview your ASCII picture</summary><pre>{asciiPreview}</pre></details>}<p className="credentials-warning">Keep the Markdown file private: it contains the link and both unlocking credentials.</p></div>}</Modal>}

      {showSettings && <Modal title="Make it feel like you" eyebrow="YOUR LITTLE PREFERENCES" onClose={() => setShowSettings(false)} wide><div className="settings-grid"><section className="settings-section"><h3><Clock3 size={18}/> Local note retention</h3><p>Only notes stored in this browser. When enabled, older notes are automatically deleted based on creation date.</p><div className="field-group"><label htmlFor="local-mode">Keep notes</label><select id="local-mode" className="text-input" value={settingsDraft.localRetention.mode} onChange={(e) => setSettingsDraft((s) => ({ ...s, localRetention: { ...s.localRetention, mode: e.target.value as "never" | "after" } }))}><option value="never">Forever (until manually deleted)</option><option value="after">For a limited time</option></select></div>{settingsDraft.localRetention.mode === "after" && <div className="inline-fields"><input className="text-input" type="number" min="1" max="365" aria-label="Local retention number" value={settingsDraft.localRetention.value} onChange={(e) => setSettingsDraft((s) => ({ ...s, localRetention: { ...s.localRetention, value: Number(e.target.value) } }))}/><select className="text-input" aria-label="Local retention unit" value={settingsDraft.localRetention.unit} onChange={(e) => setSettingsDraft((s) => ({ ...s, localRetention: { ...s.localRetention, unit: e.target.value as "days" | "weeks" | "months" } }))}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months (30 days)</option></select></div>}</section><section className="settings-section"><h3><LockKeyhole size={18}/> Shared link retention</h3><p>Default for new links only. Changing this does not extend links already sent.</p><div className="inline-fields"><input className="text-input" type="number" min="1" max="365" aria-label="Default share expiration number" value={settingsDraft.shareRetention.value} onChange={(e) => setSettingsDraft((s) => ({ ...s, shareRetention: { ...s.shareRetention, value: Number(e.target.value) } }))}/><select className="text-input" aria-label="Default share expiration unit" value={settingsDraft.shareRetention.unit} onChange={(e) => setSettingsDraft((s) => ({ ...s, shareRetention: { ...s.shareRetention, unit: e.target.value as ShareUnit } }))}><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select></div><span className="field-hint">Up to 90 days in total.</span></section><section className="settings-section"><h3><Pencil size={18}/> Typing speed</h3><p>How quickly a shared message appears, one character at a time.</p><input className="range-slider" type="range" min="10" max="150" step="5" value={settingsDraft.typingSpeedMs} onChange={(e) => setSettingsDraft((s) => ({ ...s, typingSpeedMs: Number(e.target.value) }))}/><div className="range-ends"><span>Fast</span><strong>{settingsDraft.typingSpeedMs} ms / character</strong><span>Slow</span></div></section><section className="settings-section"><h3><Sparkles size={18}/> Background colors</h3><p>Pick the colors that feel most like you.</p><div className="color-row"><label htmlFor="background-color">Page background</label><div className="color-control"><input id="background-color" type="color" value={settingsDraft.backgroundColor} onChange={(e) => setSettingsDraft((s) => ({ ...s, backgroundColor: e.target.value }))}/><code>{settingsDraft.backgroundColor.toUpperCase()}</code></div></div><div className="color-row"><label htmlFor="flying-color">Flying objects</label><div className="color-control"><input id="flying-color" type="color" value={settingsDraft.flyingColor} onChange={(e) => setSettingsDraft((s) => ({ ...s, flyingColor: e.target.value }))}/><code>{settingsDraft.flyingColor.toUpperCase()}</code></div></div></section><section className="settings-section">
          <h3><ImagePlus size={18}/> Message placement</h3>
          <p>Choose whether the recipient reads your typed note below the picture or beside it. On phones, the message stacks below the picture.</p>
          <div className="field-group"><label htmlFor="message-placement">Message position</label>
            <select id="message-placement" className="text-input" value={settingsDraft.messagePlacement} onChange={(e) => setSettingsDraft((s) => ({ ...s, messagePlacement: e.target.value as AppSettings["messagePlacement"] }))}>
              <option value="below">Below the picture</option>
              <option value="right">To the right of the picture</option>
            </select>
          </div>
        </section>
        <section className="settings-section">
          <h3><Music2 size={18}/> Music player placement</h3>
          <p>Keep the player below the picture, or use a top-left music control above it. Collapsing keeps the player mounted; MP3 keeps playing, while YouTube keeps its video visible.</p>
          <div className="field-group"><label htmlFor="music-placement">Player position</label>
            <select id="music-placement" className="text-input" value={settingsDraft.musicPlacement} onChange={(e) => setSettingsDraft((s) => ({ ...s, musicPlacement: e.target.value as AppSettings["musicPlacement"] }))}>
              <option value="below">Below the picture</option>
              <option value="top-left">Top-left of the picture</option>
            </select>
          </div>
        </section>
        <section className="settings-section wide-setting"><h3><Heart size={18}/> Pick your flying object</h3><p>The little icons float from the bottom-right of the page toward the upper-left. Their color also controls the app&apos;s pink text and accent colors.</p><div className="icon-picker">{FLYING_ICONS.map((name) => { const Item = DECORATIONS[name as FlyingIconName]; return <button className={`pick-icon ${settingsDraft.flyingIcon === name ? "chosen" : ""}`} type="button" key={name} title={name} aria-label={`Flying ${name}`} aria-pressed={settingsDraft.flyingIcon === name} onClick={() => setSettingsDraft((s) => ({ ...s, flyingIcon: name }))}><Item size={23} /><span>{name}</span></button>; })}</div></section></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setShowSettings(false)}>Cancel</button><button className="button primary" type="button" onClick={applySettings}><Check size={17}/> Save preferences</button></div><div className="settings-data-section"><h3>Your local data</h3><p>Back up all notes, original pictures, music links, and MP3 files to a JSON file, or import an earlier backup. These backups are not encrypted.</p><div className="data-actions"><button type="button" className="button secondary" disabled={busy} onClick={backup}><Download size={16}/> Export JSON backup</button><label className={`button secondary file-label ${busy ? "is-disabled" : ""}`}><Upload size={16}/> Import JSON backup<input type="file" accept=".json,application/json" onChange={restore} disabled={busy}/></label><button type="button" className="button dangerous-ghost" onClick={() => { setShowSettings(false); setConfirmAction({ kind: "clear" }); }}><Trash2 size={16}/> Clear local data</button></div></div></Modal>}

      {confirmAction && <Modal title={confirmAction.kind === "clear" ? "Clear your little library?" : "Delete this note?"} eyebrow="PLEASE CONFIRM" onClose={() => setConfirmAction(null)}><p className="confirm-text">{confirmAction.kind === "clear" ? "This deletes all notes, original pictures, music links, MP3 files, and preferences saved in this browser. This cannot be undone unless you exported a backup." : "This note and its attached picture will be removed from this device. Existing encrypted links cannot be revoked this way."}</p><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setConfirmAction(null)}><ArrowLeft size={16}/> Keep it</button><button className="button danger" type="button" onClick={confirmDelete}><Trash2 size={16}/> Yes, delete</button></div></Modal>}

      {feedback && <div className="toast-message" role="status"><Sparkles size={17}/> {feedback}<button type="button" onClick={() => setFeedback("")} aria-label="Dismiss message"><X size={15}/></button></div>}
    </main>
  );
}
