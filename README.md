# Dearplume ♡

*A little note, a lot of heart.*

Dearplume is a cute, local-first message maker for friends, crushes, and loved ones. Write a message, attach pictures, choose your main ASCII image, save it privately, then choose whether to send an encrypted, expiring link. The chosen main picture appears as ASCII art, then all photo previews cycle in a layered slideshow after the message finishes typing.

> **Dearplume is a separate application.** It takes inspiration from Dayflow's local-first, secure-link workflow but does not require or import Dayflow files.


## What's new in v0.1.10 — Note expiration, washi tape and color palettes

- **Set an expiration per note:** In **Create/Edit a note → This note's self-expiration**, choose **Use Settings default**, **Keep this note forever**, or **Delete after 1–365 days/weeks/30-day months**. Custom deadlines are calculated when saving. Editing other fields does **not** extend an unchanged deadline. The deadline is visible on the note card and View modal.
- **Independent local and shared-link expiration:** Local note expiration deletes the creator's IndexedDB copy; it does **not** revoke a previously shared encrypted link. Its expiration remains independent and is checked by the server. Local cleanup runs on page load and every minute **while the app is open**, not when the browser is closed. Notes with **Keep forever** override the global local retention setting; notes choosing **Use Settings default** inherit it.
- **Tape-like paper design:** Diagonal washi tape decorates note cards, previews and letters, with layered shadows and slightly irregular paper edges. No new assets required.
- **Three suggested color sets:** **Rose Letter**, **Moonlit Lilac**, and **Sage Garden**. Under Settings choose a preset, then optionally adjust the **Page background**, **Flying objects**, and the new **Text color**. A live preview shows the selection.
- **Automatic text contrast:** Displayed text adjusts to target a **4.5:1 contrast ratio** against the page and cream letter paper separately. The chosen hex color is saved unchanged; the displayed text color adjusts only when contrast is low. Newly shared encrypted notes include this preference. Older links use the default text color.
- **Backup compatibility:** New per-note expiration overrides are included in JSON backups. Existing notes/backups continue to work without migration. The original `DEARPLUME_SHARE_SECRET` must remain unchanged.

| Individual note option | Local deletion behavior |
| --- | --- |
| Use Settings default | Follows Settings → Local note retention |
| Keep this note forever | Overrides global automatic deletion |
| Delete after 7 days | Fixed deadline 7 days after saving; removed during the next open-app cleanup |

> **Note:** A note deleted locally may still be available through an unexpired encrypted Vercel Blob share. Change the sharing dialog's link expiration separately.

Run `npm run test:share`, `npm run typecheck`, `npm run lint` and `npm run build` after installing dependencies.

## System Architecture: Encrypted URL Shortening

Dearplume implements a **server-backed, reference-based URL shortening system** using Next.js API routes, AES-256-GCM encryption, PBKDF2-SHA256 key derivation, and private Vercel Blob storage.

Instead of embedding the entire encrypted message in a URL, Dearplume stores the encrypted payload privately and generates a short, random reference ID.

### Architecture Diagram

![Dearplume encrypted short-link architecture](docs/dearplume-shortlink-architecture.svg)

### How It Works

#### 1. Local Message Creation

- Users create messages with text, photos, and optional background music.
- Original messages and attachments are stored locally in the browser using IndexedDB.
- No registration or cloud database is required for ordinary message management.

#### 2. Encrypted Share Generation

- The creator selects a message to share.
- A password, generated access salt, and expiration period are configured.
- Only the selected message and its shareable attachments are submitted to the Next.js API.
- The server validates and encrypts the shared content using AES-256-GCM.
- The encrypted snapshot is stored in private Vercel Blob storage.
- A random reference ID is generated for the short link.

#### 3. Short URL Generation

**Previous format:**

```text
https://dearplume.jpsmiraflores.me/s#eyJ2IjoxLCJrIjoi...
```

**Current format:**

```text
https://dearplume.jpsmiraflores.me/s#r_1794052800000_a9KpT3n...
```

The new URL contains a reference to the encrypted data rather than the complete encrypted payload.

The fragment identifier (`#r_...`) is processed by the browser and used to request the corresponding encrypted share through the Next.js API.

#### 4. Recipient Authentication

- The recipient opens the shared URL.
- The application requests the password and access salt.
- The Next.js API retrieves the encrypted snapshot from private Vercel Blob storage.
- The server validates the credentials and expiration.
- Invalid credentials, expired links, or tampered payloads are rejected.
- Successful authentication unlocks the read-only message.

#### 5. Message Presentation

After successful decryption, the recipient can experience:

- ASCII art converted from the selected main picture.
- A customizable typing animation.
- ASCII-to-photo transitions.
- An infinitely looping photo slideshow.
- Optional MP3, YouTube, or Spotify background music.
- Custom themes, accent colors, and animated backgrounds.

#### 6. Expiration and Cleanup

- Share expiration is validated server-side.
- Expired links cannot be unlocked.
- A scheduled cleanup endpoint removes expired share objects from private storage.
- Expiration cannot prevent recipients from saving content already accessed.
- Individual early revocation requires server-managed state.

### Architecture Components

| Component | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Message creation and presentation |
| Local Storage | IndexedDB | Local messages, original photos, and attachments |
| API Layer | Next.js Route Handlers | Share creation, lookup, and authentication |
| Encryption | AES-256-GCM | Authenticated encryption of shared data |
| Key Derivation | PBKDF2-SHA256 | Derivation of cryptographic keys |
| Reference ID | Random opaque identifier | Identifies stored encrypted snapshots |
| Object Storage | Private Vercel Blob | Encrypted message and media storage |
| Access Protection | Password and access salt | Required credentials for unlocking |
| Expiration | Server-side validation | Rejects expired shared links |
| Cleanup | Scheduled serverless endpoint | Deletes expired stored content |

### Security Model

Dearplume follows a **local-first, selective-sharing architecture**.

- Ordinary message data remains in the creator's browser.
- Only explicitly shared content is uploaded.
- Shared snapshots are encrypted before private storage.
- Passwords and access salts are not included in generated URLs.
- Server-side encryption secrets are never exposed through public environment variables.
- A short reference ID does not grant access to decrypted content.
- Expiration is enforced when the recipient attempts to unlock a share.
- Original full-resolution photos remain local; shared links contain compressed photo previews.
- Legacy encrypted URLs remain supported for backward compatibility.

**Architecture Pattern:** Server-Backed, Reference-Based URL Shortening with Encrypted Object Storage.

**Design Goal:** Provide short, password-protected, expiring sharing links without requiring user accounts or a traditional application database.


## What changed in v0.1.7 — Message placement and picture-corner music

Settings → **Message placement** now lets you choose **Below the picture** or **To the right of the picture**. The side-by-side layout automatically stacks on mobile. Settings → **Music player placement** lets you choose **Below the picture** or a small, expandable **Top-left of the picture** music button placed above the picture. These choices are saved locally and embedded in *newly generated* protected shares. Previously generated top-right shares also display the new top-left dock. Closing the controls no longer unmounts the player: MP3 continues playing, Spotify may continue depending on its embed and browser, while YouTube keeps its video visible with extra controls collapsed. The player expands in normal page flow instead of covering the picture.

**YouTube audio-only limitation:** The official embedded YouTube player must be visible (minimum 200 × 200 pixels), so Dearplume cannot provide a working YouTube sound-only player with just Play/Pause/volume and no video. Instead the player stays visible (at least 200 × 200 pixels) while YouTube is playing, even with its extra controls collapsed. MP3 is the fully hidden, audio-only option.

**Spotify limitations:** Spotify's official compact embed can play only a preview depending on the account, browser, track and region. Full-track playback is not guaranteed without Spotify's licensed/authenticated playback capabilities; auto-play with sound is also blocked in many browsers. Dearplume uses the official embed and cannot force full playback through its custom controls.

No database migration, dependency additions or new environment variables are required. Run `npm run test:share`, `npm run typecheck`, `npm run lint` and `npm run build` after installation.

## What's new in v0.1.6 — lint cleanup

v0.1.6 fixes the 17 ESLint errors and one warning reported against v0.1.5: settings hydration, object-URL preview effects, typing-effect reset, Next.js internal links, JSX apostrophes, and the CommonJS share test. The encrypted link format, blob storage requirements, passwords, settings, and existing messages do not change. The share tests were moved to `tests/short-share.mjs` and a harmless `.cjs` launcher remains for patch-overlay compatibility.

**Upgrade:** Extract the v0.1.6 patch over your current project, run `npm install`, then run `npm run test:share && npm run typecheck && npm run lint && npm run build`. A full lint/build verification is pending locally because this patch was prepared in an environment where npm dependency installation timed out.

## What's new in v0.1.5 — short links and compact music

New shares now use **a short private-Blob reference** (for example `https://dearplume.example/s#r_1794052800000_a9KpT3n...`) instead of embedding thousands of characters of ciphertext in the URL. Dearplume still uses authenticated AES-256-GCM encryption and requires the **password and generated access salt**. The server uploads only the encrypted share token to your **private Vercel Blob store**, under an unguessable reference. The server resolves the reference and enforces expiry when unlocking; no personal account or conventional database is needed. Local composition remains browser-only. The existing long links continue to unlock.

**Vercel Blob is now required for creating *all new short links***, including notes with YouTube/Spotify music or no music. A private Blob store must be connected to the environment where you create links. `DEARPLUME_SHARE_SECRET` must remain unchanged. The same daily `/api/music-cleanup` job now deletes expired encrypted share snapshots as well as expired MP3s; keep `CRON_SECRET` configured. Stored snapshots incur Vercel Blob storage and requests; cleanup is best effort, while expiry is enforced at unlock even if the job has not run.

The recipient's music area is now smaller. YouTube offers a Play/Pause button and volume slider and keeps the official embedded player **visible at 280 × 200 pixels** (YouTube requires at least 200 × 200 and doesn't permit hidden audio-only playback). Spotify keeps its compact 152px player. In the recipient view, provider embeds load **after the note is unlocked**. Dearplume attempts to start YouTube playback when more than half of the player is visible. **Sound autoplay is not guaranteed** because browsers can require a manual tap. Composer previews still ask before connecting to the provider. Loading the embed reveals the recipient’s IP/browser details to YouTube or Spotify. Existing MP3 uploads stay audio-only with standard controls.

**Upgrade:** Apply the v0.1.5 patch, run `npm install`, ensure the private Blob store is connected to Production (and Development for local tests), and redeploy. Existing notes and share links are compatible. The earlier v0.1.3–v0.1.4 sections below describe the *historical* behavior of those releases; use this section for the current link-storage requirements.

## What changed in v0.1.4 — External music links (historical)

In the note composer, choose **YouTube / Spotify link** or **Upload MP3**. Paste official YouTube video URLs (`https://youtu.be/3JbmE3jjCSk` or `https://www.youtube.com/watch?v=3JbmE3jjCSk`) or a Spotify track URL (`https://open.spotify.com/track/0kN8xEmgMW9mh7UmDYHlJP`). Query parameters are ignored; only the official host and valid media ID are kept.

- A song link is saved in IndexedDB as a canonical URL. You can test its official embed after clicking **Load player**.
- A new protected share encrypts only the YouTube/Spotify provider and media ID in the share token. This **does not download music, scrape providers, or upload songs to Vercel Blob**.
- In the recipient view, the embed loads after unlocking and YouTube attempts playback only when its player is sufficiently visible. Browser restrictions may still require tapping Play. MP3 plays while its controls are collapsed. Spotify may continue playing with the iframe still mounted but this depends on Spotify/browser behavior. YouTube requires a visible player while playing. No guaranteed autoplay or Spotify full-song access is promised. Some content may refuse embedding or be unavailable by region/account. **Open on YouTube/Spotify** is provided as a fallback.
- Loading a third-party player sends browser data (such as IP address) to that provider. Links are visible to listeners after unlock, but aren't secrets stored by Dearplume.
- The **MP3 upload** mode remains unchanged: maximum 2 MB, private Vercel Blob required only when sharing that MP3.
- Existing local notes, encrypted shares, photos, typing, retention, and backups continue to work. No migration needed.

### Fix: `Module not found: Can't resolve '@vercel/blob'`

The package is already declared in `package.json`, but it must be installed in your checkout. In the project root, run:

```bash
npm install @vercel/blob@^2.8.2
npm run dev
```

This dependency is needed **at build time even if you only use external music links**, because Dearplume still supports uploaded MP3s via `src/lib/musicStorage.ts`. For MP3 sharing, you also need a **private Vercel Blob store** and its credentials. Historically (v0.1.4), no Blob store was required for link-based sharing; **v0.1.5 requires private Blob for all new short links**.

## What changed in v0.1.3

- **Theme-linked accents:** The flying-object color now also determines all pink accent text, buttons, tabs, icons, highlights, and focus rings. Text colors are darkened automatically for contrast. The chosen color is copied into each encrypted shared note, so the recipient sees the same theme. Saved settings continue to work.
- **Optional MP3:** Attach a background song (MP3, maximum **2 MB**) when creating or editing a note. It is saved as a Blob in local IndexedDB and included in JSON exports/imports. You can preview it locally. Music is optional; pick either a streaming link or an uploaded MP3.
- **Recipient music player:** When sharing with a song, the API encrypts and uploads the MP3 to a **private Vercel Blob store**. Unlocking uses both credentials and the unexpired share token to retrieve it. The receiver gets play/pause/seek/volume controls with looping. Browsers usually block autoplay with audio, so music starts after the recipient presses **Play**, not automatically.
- **Keep notes local by default:** Media is uploaded only when generating a music-attached link. In v0.1.5 even notes without music use private Blob for short encrypted references.
- **Expired audio cleanup:** `vercel.json` configures a daily cleanup route which requires `CRON_SECRET`. The server rejects expired unlocks even if cleanup hasn't run; the cleanup removes the encrypted stored bytes later.

### One-time setup for sharing MP3s

1. Install dependencies with `npm install` (new dependency: `@vercel/blob`).
2. In Vercel Storage, create a **private** Blob store attached to your Dearplume project. Configure `BLOB_READ_WRITE_TOKEN` in your local `.env.local` and Vercel's environment variables, or use the supported Vercel Blob store environment configuration.
3. Set `CRON_SECRET` to a fresh random secret in Vercel for the daily `/api/music-cleanup` job. Deploy as a Next.js app (not static export).
4. Add your MP3 in the note composer and create a **new** protected link. Existing long links without MP3 continue to work with just `DEARPLUME_SHARE_SECRET`; new short links also need private Blob credentials.
5. If the MP3 is larger than 2 MB, trim/compress it before attaching; server uploads have body limits. A 2 MB file is **not** embedded in the URL.

**Storage/privacy:** The original MP3 lives in your local browser. When you share it, the server receives its bytes over HTTPS and encrypts it with AES-256-GCM before storing it in a private Vercel Blob object. Its private pathname is inside the password-protected share token. Authorized recipients can play, download, or record decrypted audio once unlocked. The MP3 remains stored until scheduled cleanup runs; deleting the local note will not revoke an existing share. The music server key depends on `DEARPLUME_SHARE_SECRET`; rotating that secret makes existing links and music unreadable. Vercel Blob may incur storage and transfer charges. Share only audio you have permission to use.

**Compatibility:** Old notes and old shared links remain readable. For old links, appearance behavior remains as it was when those links were generated, while the page's accent styling follows the shared flying color when unlocked.

## Features

| Part | What it does |
| --- | --- |
| Create a note | Title, message, optional YouTube/Spotify track URL or MP3 (2 MB limit), and optional gallery of up to 8 images (JPG/PNG/WebP/GIF, 6 MB each, 24 MB total) |
| Created notes | Appears after the first note is saved. View, edit, delete, share; cards show date and picture |
| Private local storage | Uses browser **IndexedDB** for original notes and images; `localStorage` for preferences |
| Settings | Gear icon next to the tabs: local note retention, **independent** default link expiration, typing speed, **message position**, **music player position**, page background, flying icon and color |
| Flying decorations | Choose hearts, stars, flowers, sparkles, moons, clouds, gifts or butterflies; they fly **from bottom-right toward upper-left** |
| Local retention | Keep forever or auto-delete notes by creation age after a set number of days, weeks, or 30-day months |
| Secure sharing | Share one selected note with an AES-256-GCM encrypted snapshot stored in private Blob, referenced by a short URL |
| Password and salt | Enter a password (minimum 12 characters) or generate one. A fresh access salt is created automatically |
| Shared view | Read-only unlock screen. After unlocking, the chosen picture starts in ASCII. Once typing completes, all images rotate as a layered slideshow; Show all reveals them and Replay resets it |
| Link expiration | Set minutes, hours, or days; maximum 90 days. The server enforces the expiration on unlock |
| Markdown export | Download a `.md` file containing title, link, password, access salt, expiration time in PHT, and unlock instructions |
| Private backups | Export and import JSON backups including the original photos. Clear Local Data with custom confirmation |
| Responsive UI | Works on phones and desktops, no account required, no external analytics or third-party fonts |

## Tech stack

- Next.js 16.4.3 (App Router), React 19.2, TypeScript, CSS, Lucide icons.
- IndexedDB (local notes + image Blobs), browser localStorage (settings).
- Next.js Node.js API route for encrypting and unlocking **only explicitly shared notes**.
- AES-256-GCM, PBKDF2-SHA256 (220,000 rounds), server-held 32-byte secret, random IV/KDF salt.
- `gzip` compresses encrypted share snapshots before private Blob storage. Pictures are converted to **ASCII plus a small, downscaled WebP/JPEG preview** in the browser. Both are encrypted in the share snapshot; the full-resolution original stays in IndexedDB.

## Getting started

**v0.1.2:** Shared pictures now reveal a compact color image after typing ends. No database, dependency, or local data migration is needed; generate a **new link** to include the color preview.

**v0.1.1 fix:** The butterfly flying-background option uses a local SVG instead of importing a nonexistent `Butterfly` export from `lucide-react`. Existing saved preferences continue to work.


The dependency lockfile is generated by your first `npm install` (it is not included in this source-only ZIP). Commit the generated `package-lock.json` when you prepare your repository.


```bash
npm install
cp .env.example .env.local
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated **64-character hex key** into `.env.local` as `DEARPLUME_SHARE_SECRET`. Never put the private key in `NEXT_PUBLIC_` variables and never commit `.env.local`.

```bash
npm run dev
```

Visit `http://localhost:3000`. Local notes work without an active secret; generating or unlocking shared links needs the server secret.

### Deploy to Vercel

1. Push this Next.js project to GitHub.
2. Import it into Vercel as a **Next.js project**.
3. Add `DEARPLUME_SHARE_SECRET` under the project's **server-side environment variables** for each environment where sharing is needed.
4. Deploy and open the HTTPS site. Use that deployment URL to generate share links.

**Do not use `output: "export"`.** The API route at `/api/message-share` and private Blob operations require server-side execution. An `out/` folder, if generated manually, cannot provide encrypted link creation/unlock services.

To check changes:

```bash
npm run test:share
npm run typecheck
npm run lint
npm run build
```

### Local-network development access (optional)

If you open the development site from another device using a LAN address such as `192.168.1.2`, Next.js may log a warning about cross-origin access to `/_next/hmr`. This is **independent** of the fixed icon compilation error. If you intentionally need development access from that host, add the exact LAN origin to `allowedDevOrigins` in `next.config.ts` and restart the dev server. Do not allow untrusted origins or use a broad wildcard.

## Sharing flow

1. Open **Created notes**, then **Share** on the intended note.
2. Choose the expiration duration (number + Minutes/Hours/Days). This is independent from locally saved note retention.
3. Enter at least a 12-character password or use **Generate**. The app automatically creates the separate access salt.
4. Click **Generate & copy protected link**. The local picture, if any, is converted to 52-column ASCII **and** a compact color preview. Both are included in the encrypted share token.
5. Copy the password and access salt separately, or export the Markdown instructions. **Keep the `.md` file private** because it contains all access details.
6. The recipient opens `/s#r_<expiresAt>_<random-id>` (or an older `/s#<encrypted-token>` link), enters both secrets, and sees ASCII art while the note types. **When the last character appears, the picture fades into its color version.** Show all finishes typing and reveals the picture immediately; Replay restores ASCII and restarts typing.

The image shown after typing is a **compressed color copy**, not the full-resolution original. The compressed color preview keeps server storage and transfers modest. Image details may be reduced. Older links created before v0.1.2 contain ASCII only and continue to show ASCII after typing.

The short reference is in the **URL fragment (`#`)**, which is not transmitted in the initial page GET request. On unlock, the browser explicitly sends it to the Dearplume API over HTTPS with the credentials; the API retrieves the encrypted token from private Blob storage. The copied link is a **snapshot**; subsequent edits to the local note do not change the recipient's version.

## How storage and retention work

- Notes, messages, timestamps, and original photos stay in **IndexedDB** in the browser origin that created them.
- Visual settings and default durations stay in **localStorage** under `dearplume.settings.v1`.
- Local auto-deletion is enforced **when the app opens and while it stays open (every minute)**. It cannot run when the app is closed. Expiration is measured from original creation time; editing a note does not reset it.
- The *share link* expiration is checked **by the server at unlock time**, even if the creator's browser is closed.
- Changing a local retention setting does not affect an already generated link. Changing default link retention does not extend existing links.
- Clearing browser site data, changing device/browser, or using private browsing can remove data. Export backups before clearing site data.
- Backups are **not encrypted**. The import merges notes by ID, overwriting matching IDs.

## Project structure

```text
dearplume/
├── .env.example
├── .gitignore
├── LICENSE
├── PATCH-NOTES.md
├── README.md
├── SECURITY.md
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── tests/
│   ├── short-share.mjs
│   └── short-share.cjs (compatibility launcher)
├── postcss.config.js
├── public/
│   └── dearplume-logo.svg
├── src/
│   ├── app/
│   │   ├── api/message-share/route.ts
│   │   ├── components/
│   │   │   ├── FlyingBackground.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── DearplumeApp.tsx
│   │   │   └── SharedMessageView.tsx
│   │   ├── s/page.tsx
│   │   ├── globals.css
│   │   ├── dearplume.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── ascii.ts
│   │   ├── defaults.ts
│   │   ├── download.ts
│   │   ├── localMessages.ts
│   │   ├── messageShareCrypto.ts
│   │   └── shareMarkdown.ts
│   └── types/
│       ├── message.ts
│       ├── settings.ts
│       └── share.ts
└── tsconfig.json
```

## Privacy and security notes

The normal composing mode doesn't upload notes or pictures; it uses your browser storage. Sharing is **not fully offline**: the selected message, its ASCII conversion, a downscaled color picture preview (if attached), password, and access salt are sent to your own server endpoint over HTTPS when generating the encrypted snapshot. Unlocking sends the token and credentials to that same endpoint. No conventional database is needed. On creating a link, the API **persists only the encrypted snapshot** in private Vercel Blob storage, not plaintext credentials. The server receives the plaintext note and credentials transiently over HTTPS to encrypt it.

Existing shares are not currently individually revocable through the UI, even though new shares have server-side encrypted storage. Anyone holding the link **and both credentials** can view and save the content before expiration. Expiration doesn't erase content previously viewed or screenshotted. There is **no distributed unlock-attempt rate limiting** in this starter version; add a managed rate limiter/WAF for public deployment. Read [SECURITY.md](SECURITY.md) for security details and limitations.

## Git workflow

This project's Git remote convention follows Dayflow: **`gh`**, not `origin`.

```bash
git init
git switch -c feat/dearplume-initial-release
git add .
git commit -m "feat: launch Dearplume local notes and encrypted sharing" -m "Add private messages with photo attachments, ASCII share view, typing effects, retention settings, customizable flying backgrounds, and Markdown export."
git remote add gh https://github.com/YOUR_USERNAME/dearplume.git
git push -u gh feat/dearplume-initial-release
```

Replace `YOUR_USERNAME` with your actual GitHub username and create the empty repository first. If you already configured `gh`, skip `git remote add gh`.


## Multiple pictures and animated memories (v0.1.9)

- Choose up to **8 images per note** (PNG, JPG, WebP, GIF), up to **6 MB each and 24 MB combined**.
- Pick one **Main ASCII** picture in the editor; other pictures are not converted to ASCII.
- The main picture is shown as ASCII while the letter is being typed. Once the message finishes (or **Show all** is clicked), the main picture reveals in color and the gallery cycles as a **layered, repeating photo stack** every 3.5 seconds. The receiver can pause or move between photos; Replay resets the animation.
- Original picture files stay in **IndexedDB**. Encrypted shares carry smaller, downscaled previews in a **private Vercel Blob snapshot**. They are not full-resolution images. No extra Blob store, credentials, or dependencies are needed beyond v0.1.8.
- Notes and JSON backups from v0.1.8 are accepted, including the previous `photo` and `photoDataUrl` formats. Existing long and short share links still unlock.
- The maximum encrypted shared token is now **180,000 characters** to accommodate up to 8 previews. Sharing large collections requires an available private Blob store.
- Local JSON exports include the entire photo collection and selected main photo, and are **not encrypted**. Large collections can produce large backups.
