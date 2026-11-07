# Dearplume security notes

## Trust boundaries

**Normal editing:** IndexedDB stores notes and original image Blobs on this device. localStorage stores only display preferences and defaults. The app does not load external analytics, third-party fonts, image hosting, or external scripts. Browser extensions, someone using your logged-in device, and any compromised scripts running under this origin can still access local content. Browser storage is not encrypted at rest by Dearplume.

**Explicit sharing:** The sender converts their image into ASCII locally and makes a downscaled color preview (WebP or JPEG, bounded in size). The browser sends the selected note title, message, ASCII art, compressed color preview (if any), password and access salt to `POST /api/message-share` over HTTPS. The server uses the private `DEARPLUME_SHARE_SECRET` plus the password and access salt to derive the encryption key, then returns an encrypted URL token. The server does not persist notes or credentials.

**Unlock:** The recipient sends the encrypted token, password and access salt to the API over HTTPS. AES-GCM authentication is verified and server-side expiry is checked before the data is returned to the recipient. The recipient can save or screenshot decrypted content.

## v0.1.6 maintenance patch

This release adjusts React effects, media-preview object URL lifecycle management, internal navigation, and lint/test structure. No changes were made to encrypted tokens, stored note records, password/salt handling, expiration policy, or Vercel Blob authorization. Existing notes and short/legacy shares remain compatible. Run the share tests and application checks after applying the patch.

## Cryptographic details

- AES-256-GCM with random 96-bit nonce and authentication tag.
- PBKDF2-SHA256 with 220,000 iterations and a fresh 128-bit random derivation salt for every share.
- Server secret is a 256-bit hex key. An HMAC-SHA256 combines this server secret with the password-derived key.
- Secrets are not placed in URLs. The access salt is **not** the internal PBKDF2 salt.
- Token versioning, authenticated decryption, format validation, and bounded decompression.
- Link token is placed after `#` so it isn't sent to the server in the initial GET. It is transmitted intentionally to the unlock endpoint.
- Server API responses include `Cache-Control: no-store`.

## v0.1.5 short-link storage and music policy

New notes are encrypted by the Dearplume server using the existing AES-256-GCM/PBKDF2 + `DEARPLUME_SHARE_SECRET` mechanism, then stored as an **encrypted token only** in a *private* Vercel Blob object. An opaque share reference includes a public expiration timestamp and 144 random bits. The link contains neither plaintext messages, photos, passwords nor salts. Creating a new short link requires private Blob credentials. The server sees the selected note and password/salt transiently while encrypting and unlocking; this is **not end-to-end encryption**. Do not log request bodies or secret values.

The unlock API resolves the random reference server-side, applies existing AES-GCM authentication and rejects expired shares. Expired blobs are deleted by the existing daily authenticated `/api/music-cleanup` job (also responsible for MP3s). Cleanup is best effort: missing `CRON_SECRET`, a failed cron job or provider issues can leave *encrypted*, inaccessible objects in storage past expiry. Storage and transfer charges may apply. No early-revoke UI exists yet; local deletion does not revoke shared links. Previously generated long encrypted-URL links remain supported.

YouTube requires its embedded player to be visible and at least 200 × 200 pixels; Dearplume displays it at 280 × 200 with external Play/Pause and volume controls that use the official IFrame API. It cannot be presented as a hidden audio-only stream. The recipient unlocks first, then Dearplume loads the YouTube/Spotify embed. This sends their IP/browser information to the provider **without a second loading confirmation**; composer previews still require an explicit click. YouTube playback is attempted only when more than half of its visible player is in view. Playback with sound may need an additional manual tap because autoplay cannot be guaranteed. Spotify retains its own embed controls and access limits. The full note may still be saved after unlock; animations are presentation only.

## Limitations

- **Server-side expiration does not revoke access to already downloaded content.** It only prevents future unlocks.
- **No early revocation UI:** This version stores encrypted snapshots but does not yet provide individual link revocation. Deleting the local note or changing the password later does not invalidate prior link snapshots.
- **No distributed rate limiting:** The starter has no cross-instance attempt counter. Before public use, enable rate limits / challenge controls at the hosting edge for `/api/message-share`, especially `action: unlock`.
- **URL length:** New links contain only a short random reference; older links still contain encrypted snapshots. Oversized share payloads may be rejected on creation.
- **Local backups and Markdown instructions are plaintext:** Treat them as sensitive. The Markdown file contains both credentials and the link.
- **Changing server secret:** Rotating `DEARPLUME_SHARE_SECRET` makes previously generated links undecryptable.
- **Browser storage lifetime:** Clearing site data or using private sessions can remove private notes.
- **Abuse and privacy:** Only share a person's photo or messages with their consent.

## Recommended deployment controls

- HTTPS-only deployment.
- Keep `.env.local` out of Git and avoid `NEXT_PUBLIC_` for secrets.
- Disable request-body logging for the share API. Don't add analytics to the unlock page.
- Configure edge/API rate limiting and monitor abnormal traffic without storing secrets.
- Restrict request sizes at your hosting/CDN layer.
- Protect the repository and environment variables with least-privilege access.
- Set a strong Content Security Policy and carefully review any new third-party dependencies.

## Report a vulnerability

Open a private advisory on the repository hosting service instead of posting real access links or credentials in public issues.

## Color picture reveal (v0.1.2)

- Newly generated links containing a photo include a compact, downscaled raster preview alongside the ASCII art, inside the authenticated encrypted token. The original full-resolution picture stays in IndexedDB.
- The selected preview is transmitted to the app's share API in the create request **before the server encrypts the share**. As with message text, the server can see it during that request; never claim zero server exposure. It is not sent to third-party image hosting or stored as a separate file by this app.
- Unlock returns the decrypted preview to the authorized browser, which can save it even before the animation finishes. The ASCII-to-color animation is a presentation effect, **not a security boundary**.
- The preview is limited to JPEG/WebP data URLs with a 12,000-character upper bound. This keeps stateless link lengths manageable and disallows SVG content. Large or detailed photos may appear lower-resolution.
- Links created before this update remain valid and show ASCII only. Existing shared links cannot be updated in place.

## v0.1.3 MP3 privacy boundary

Uploaded MP3 files are persisted **only** in browser IndexedDB until the user explicitly generates a music-attached link. Sharing then sends that MP3 to the Dearplume server over HTTPS. The server encrypts bytes with a server-derived AES-256-GCM music key and uploads them to a Vercel Blob store configured with **private** access. The random media pathname is included in the authenticated share token (not as a public media URL). `/api/message-music` checks the same link expiration, password, and access salt before reading and decrypting music. Never expose `BLOB_READ_WRITE_TOKEN` or `CRON_SECRET` in client code.

This changes the old stateless media model: music files now have server-managed encrypted copies and incur Blob costs. `vercel.json` schedules daily deletion of expired MP3 objects, but actual deletion depends on the cron deployment, configured `CRON_SECRET`, and successful runs. Without cleanup, inaccessible encrypted objects can remain stored. Before v0.1.5 the URL contained the encrypted message snapshot; new links use a short private Blob reference, never MP3 bytes. A recipient who unlocks can save decrypted music; server-enforced expiry cannot erase an audio file already downloaded. Browser autoplay restrictions require user interaction to start music.

No music is accepted from arbitrary external URLs. There is no cross-origin audio fetch. Validate MP3 headers and strict 2 MB size before upload; do not log credentials, token, or MP3 contents. Production should apply edge rate limits to creation, unlock, and music retrieval, and monitor Blob usage to prevent storage abuse.


## v0.1.4 external music links

Creators may attach official YouTube video URLs (including youtu.be links) or official Spotify track URLs **instead of** an MP3. Link parsing uses exact hostname and media ID validation; arbitrary embed HTML, redirects, JavaScript/data URLs, and third-party audio-fetch URLs are not supported. The server validates the provider and ID again and includes only those values in the authenticated encrypted note. External music URLs are not secret after unlock; recipients can open the source directly. A remote video/track can be changed, removed, geo-blocked, or made unembeddable by its provider.

In v0.1.4 the recipient had to click Load player. In v0.1.5 recipient embeds load after unlocking to attempt playback; third-party network requests then occur automatically. Loading a provider embed discloses the recipient's IP and browser details to YouTube/Google or Spotify; provider cookies/tracking and their terms apply. Browsers may block autoplay, and Spotify playback duration/login requirements vary. No direct extraction of streaming URLs or downloading protected audio occurs. In v0.1.5 new short-link sharing does use Vercel Blob to store the encrypted note snapshot, even if the song itself is a YouTube or Spotify reference.
