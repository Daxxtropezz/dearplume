## v0.1.4 — YouTube and Spotify music links (2026-11-07)
- Added optional YouTube (`youtu.be` and `youtube.com/watch`) and Spotify track (`open.spotify.com/track`) links as an alternative to MP3 uploads.
- Music source selector in note creation/editing with link validation and an opt-in embedded-player preview.
- Encrypted share URLs store only the validated provider and media ID; no audio download, external fetch, or Vercel Blob required for links.
- Recipient chooses to load the official provider player after unlock; music won't silently autoplay. A provider-page link is included for embed failures.
- MP3 uploads remain available, using private Vercel Blob storage as before.
- Maintains compatibility with existing saved notes, older encrypted links, MP3s, JSON backups, and link expiration.
- Fixed setup guidance for missing `@vercel/blob` package: run `npm install @vercel/blob@^2.8.2` from the project root.

# Dearplume Patch Notes

## v0.1.3 — Theme-matched accents and background MP3
- Pink accent text, buttons, tab states, icons and highlights now derive from the selected flying-object color, including recipient view.
- Optional MP3 up to 2 MB for each locally saved note, with local preview, editing, backup and restore.
- Sharing a music-attached note encrypts and stores MP3 in private Vercel Blob storage, requires `BLOB_READ_WRITE_TOKEN`; recipient retrieves it after password/salt unlock.
- Recipient audio controls with looping; playback is user-triggered to respect browser autoplay rules.
- Scheduled expired-MP3 cleanup endpoint authenticated with `CRON_SECRET`.
- Backward-compatible with v0.1.2 local notes and share links.

# Patch notes

## v0.1.2 — ASCII-to-color reveal (2026-11-07)

- Shared photos now start as ASCII art while the message types, then fade into a color version once the final character appears.
- Show all immediately completes typing and reveals the photo; Replay restores ASCII and restarts both effects.
- New encrypted links include a small WebP/JPEG color preview together with ASCII, without a media server or database.
- Original full-resolution photo stays in local IndexedDB; an optimized preview is sent to the app server only when the creator explicitly shares the note.
- Old encrypted links without color previews remain backward compatible (ASCII only).
- Updated share validation and user documentation. No added dependencies or new environment variables.


## v0.1.1 — Butterfly icon compile fix (2026-11-07)

- Fixed the `lucide-react` import error: `Butterfly` is not exported by the installed icon package.
- Added a built-in outline butterfly SVG; no extra dependency is needed.
- Kept the `butterfly` preference, all eight flying icon options, and existing saved settings unchanged.
- Clarified that local-network development origin warnings are separate from compile errors.
- No data migration or environment-variable changes required.


## v0.1.0 — Initial Dearplume release (2026-11-07)

- Added a pastel, responsive message-writing app with live note preview.
- Added local notes + image Blobs in IndexedDB; Created notes tab appears after first save.
- Added view/edit/delete, JSON backup import/export, clear-data confirmation.
- Added independent local retention and shared-link retention preferences.
- Added background and flying icon/color customization, with bottom-right-to-upper-left animation.
- Added typing-speed preference used in shared links.
- Added password-protected, encrypted, stateless share links with generated access salts and optional random password generation.
- Added local photo-to-ASCII conversion and read-only recipient view with typing effect, replay, and skip.
- Added Markdown export for share link and unlocking details.
- Added README, security guidance, env sample, and Next.js/Vercel setup.

### Known limitations

- Stateless links cannot be revoked early.
- Link length varies with message size; share only one message at a time.
- Public deployments require an external rate limiter for unlock attempts.
