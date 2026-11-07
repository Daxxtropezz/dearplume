# Dearplume security notes

## Trust boundaries

**Normal editing:** IndexedDB stores notes and original image Blobs on this device. localStorage stores only display preferences and defaults. The app does not load external analytics, third-party fonts, image hosting, or external scripts. Browser extensions, someone using your logged-in device, and any compromised scripts running under this origin can still access local content. Browser storage is not encrypted at rest by Dearplume.

**Explicit sharing:** The sender converts their image into ASCII locally and makes a downscaled color preview (WebP or JPEG, bounded in size). The browser sends the selected note title, message, ASCII art, compressed color preview (if any), password and access salt to `POST /api/message-share` over HTTPS. The server uses the private `DEARPLUME_SHARE_SECRET` plus the password and access salt to derive the encryption key, then returns an encrypted URL token. The server does not persist notes or credentials.

**Unlock:** The recipient sends the encrypted token, password and access salt to the API over HTTPS. AES-GCM authentication is verified and server-side expiry is checked before the data is returned to the recipient. The recipient can save or screenshot decrypted content.

## Cryptographic details

- AES-256-GCM with random 96-bit nonce and authentication tag.
- PBKDF2-SHA256 with 220,000 iterations and a fresh 128-bit random derivation salt for every share.
- Server secret is a 256-bit hex key. An HMAC-SHA256 combines this server secret with the password-derived key.
- Secrets are not placed in URLs. The access salt is **not** the internal PBKDF2 salt.
- Token versioning, authenticated decryption, format validation, and bounded decompression.
- Link token is placed after `#` so it isn't sent to the server in the initial GET. It is transmitted intentionally to the unlock endpoint.
- Server API responses include `Cache-Control: no-store`.

## Limitations

- **Server-side expiration does not revoke access to already downloaded content.** It only prevents future unlocks.
- **No early revocation:** This version is intentionally stateless. Deleting the local note or changing the password later does not invalidate prior link snapshots.
- **No distributed rate limiting:** The starter has no cross-instance attempt counter. Before public use, enable rate limits / challenge controls at the hosting edge for `/api/message-share`, especially `action: unlock`.
- **URL length:** Links contain encrypted content. Short messages and small ASCII conversions are suitable; very long messages may be rejected or fail in particular sharing apps.
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

This changes the old stateless media model: music files now have server-managed encrypted copies and incur Blob costs. `vercel.json` schedules daily deletion of expired MP3 objects, but actual deletion depends on the cron deployment, configured `CRON_SECRET`, and successful runs. Without cleanup, inaccessible encrypted objects can remain stored. The URL still contains the encrypted message snapshot, not the MP3 bytes. A recipient who unlocks can save decrypted music; server-enforced expiry cannot erase an audio file already downloaded. Browser autoplay restrictions require user interaction to start music.

No music is accepted from arbitrary external URLs. There is no cross-origin audio fetch. Validate MP3 headers and strict 2 MB size before upload; do not log credentials, token, or MP3 contents. Production should apply edge rate limits to creation, unlock, and music retrieval, and monitor Blob usage to prevent storage abuse.


## v0.1.4 external music links

Creators may attach official YouTube video URLs (including youtu.be links) or official Spotify track URLs **instead of** an MP3. Link parsing uses exact hostname and media ID validation; arbitrary embed HTML, redirects, JavaScript/data URLs, and third-party audio-fetch URLs are not supported. The server validates the provider and ID again and includes only those values in the authenticated encrypted note. External music URLs are not secret after unlock; recipients can open the source directly. A remote video/track can be changed, removed, geo-blocked, or made unembeddable by its provider.

The player **does not load until the recipient clicks Load player**, protecting recipients from automatic third-party network requests before consent. Loading a provider embed discloses the recipient's IP and browser details to YouTube/Google or Spotify; provider cookies/tracking and their terms apply. Browsers may block autoplay, and Spotify playback duration/login requirements vary. No direct extraction of streaming URLs or downloading protected audio occurs. Link-based sharing does not use Vercel Blob storage, though `@vercel/blob` is still a package dependency because uploaded MP3 support remains compiled into the application.
