## v0.1.9 — Multiple-photo memories

- Added multi-select picture attachment with eight-photo and size limits.
- Added an explicit **Main ASCII** photo selection, plus editor thumbnails and removal.
- Added a looping, layered photo stack that starts **only after** typing completes; replay resets it.
- Added slideshow pause/next/previous controls and reduced-motion transition support.
- Updated local IndexedDB models, import/export backups, and recipient view without removing legacy single-photo compatibility.
- Extended encrypted private-Blob shares for an array of validated, downsized previews.
- No new environment variables or dependencies.

# Dearplume Patch Notes

## v0.1.8 — Left-aligned music dock and persistent playback (2026-11-07)
- Replaced the top-right picture overlay with a compact top-left control **above** the picture, so expanding it pushes the photo down instead of covering the artwork.
- Collapsing the controls no longer unmounts the audio element or provider iframe. MP3 music continues until the recipient pauses it; Spotify may continue, subject to embed/browser behavior.
- YouTube keeps its official 280 × 200 video visible after collapsing (only extra controls hide) because hidden/audio-only YouTube playback is not allowed by YouTube’s policies.
- Renamed the stored `top-right` preference to `top-left` when loading local settings. Older encrypted shares with `top-right` also render the dock in the new left position.
- The media player loads only after the recipient first opens the controls. Browser autoplay with sound and provider playback limits still apply.
- New shares use `top-left` for dock placement; existing links, MP3 attachments, Spotify/YouTube IDs, passwords, salts, and stored notes need no migration.


## v0.1.7 — Layout preferences and floating music control (2026-11-07)
- Added **Message placement** under Settings: below picture, or right of picture on desktop (automatically stacked on smaller screens).
- Added **Music player placement** under Settings: below picture or a compact top-right button over the picture. The picture-corner control expands only when clicked; closing it unmounts and stops the embedded player.
- New preferences persist in localStorage and are included in new encrypted shares; they are validated server-side. Older links without these fields retain their original below-picture layout.
- MP3 attachments remain audio-only. YouTube's video must stay visible when playing via its official player; the floating control does not bypass that rule. Spotify's official embed can play only a preview for some listeners, and autoplay with sound is not guaranteed for either provider.
- No new dependencies, storage migrations, or secrets. Tested share creation/unlock including new/invalid layout values, plus TypeScript/TSX syntax checking; full Next.js lint/build are to be run on your device.

## v0.1.6 — ESLint cleanup and React effect fixes (2026-11-07)
- Fixed the 17 errors and one warning reported by ESLint on v0.1.5 without disabling application lint rules.
- Made settings hydration wait for IndexedDB initialization, preserving the server-rendered defaults until browser settings load.
- Updated picture/MP3 preview URL effects to publish object URLs asynchronously and revoke them during cleanup.
- Reset the typing animation from unlock/replay actions instead of synchronously resetting React state in an effect.
- Replaced internal `<a href="/">` navigation with Next.js `Link` and escaped JSX apostrophes.
- Migrated the share test to ESM (`tests/short-share.mjs`); retained a minimal `.cjs` compatibility launcher so existing installs do not retain an old lint-failing test after applying the patch.
- Added an expiration assertion to the share test; no changes to encrypted payloads, local storage keys, link formats, or required secrets.
- Local encryption/short-link tests and TypeScript transpilation passed. Full lint/typecheck/build must be rerun after dependencies are installed.

## v0.1.5 — Short encrypted links and compact streaming players (2026-11-07)
- New links are short `/s#r_<expiration>_<random>` references, backed by an encrypted snapshot in private Vercel Blob storage. Existing long links continue to work.
- Password and generated access salt still required; encryption and expiry are verified server-side. The original picture and note remain local until explicitly shared.
- Private Blob storage is now required for every newly generated short link, not just uploaded MP3 files.
- The daily protected cleanup endpoint now removes expired encrypted snapshots and MP3 objects; `CRON_SECRET` is still required. Expired shares are rejected immediately at unlock even if cleanup is delayed.
- Streaming music UI uses a smaller panel. YouTube has Play/Pause and volume controls via the official IFrame API, with a visible 280 × 200 video viewport due to YouTube's minimum player dimensions. Spotify uses a compact 152px embed. After unlocking, provider embeds load and YouTube attempts playback only when more than half of its player is visible. Browsers may still block sound autoplay; the recipient is told to use Play.
- Existing saved notes, passwords, salts, long links, MP3 files, backups, and settings remain compatible.

## v0.1.4 — YouTube and Spotify music links (2026-11-07)
- Added optional YouTube (`youtu.be` and `youtube.com/watch`) and Spotify track (`open.spotify.com/track`) links as an alternative to MP3 uploads.
- Music source selector in note creation/editing with link validation and an opt-in embedded-player preview.
- Encrypted share URLs store only the validated provider and media ID; no audio download, external fetch, or Vercel Blob required for links.
- Recipient chooses to load the official provider player after unlock; music won't silently autoplay. A provider-page link is included for embed failures.
- MP3 uploads remain available, using private Vercel Blob storage as before.
- Maintains compatibility with existing saved notes, older encrypted links, MP3s, JSON backups, and link expiration.
- Fixed setup guidance for missing `@vercel/blob` package: run `npm install @vercel/blob@^2.8.2` from the project root.



## v0.1.3 — Theme-matched accents and background MP3
- Pink accent text, buttons, tab states, icons and highlights now derive from the selected flying-object color, including recipient view.
- Optional MP3 up to 2 MB for each locally saved note, with local preview, editing, backup and restore.
- Sharing a music-attached note encrypts and stores MP3 in private Vercel Blob storage, requires `BLOB_READ_WRITE_TOKEN`; recipient retrieves it after password/salt unlock.
- Recipient audio controls with looping; playback is user-triggered to respect browser autoplay rules.
- Scheduled expired-MP3 cleanup endpoint authenticated with `CRON_SECRET`.
- Backward-compatible with v0.1.2 local notes and share links.



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
