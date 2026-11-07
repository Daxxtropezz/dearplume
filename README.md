# Dearplume ♡

*A little note, a lot of heart.*

Dearplume is a cute, local-first message maker for friends, crushes, and loved ones. Write a message, attach a picture, save it privately, then choose whether to send an encrypted, expiring link. Shared pictures first appear as ASCII art, then fade into a color photo when the message finishes typing.

> **Dearplume is a separate application.** It takes inspiration from Dayflow's local-first, secure-link workflow but does not require or import Dayflow files.

## What changed in v0.1.4 — External music links

In the note composer, choose **YouTube / Spotify link** or **Upload MP3**. Paste official YouTube video URLs (`https://youtu.be/3JbmE3jjCSk` or `https://www.youtube.com/watch?v=3JbmE3jjCSk`) or a Spotify track URL (`https://open.spotify.com/track/0kN8xEmgMW9mh7UmDYHlJP`). Query parameters are ignored; only the official host and valid media ID are kept.

- A song link is saved in IndexedDB as a canonical URL. You can test its official embed after clicking **Load player**.
- A new protected share encrypts only the YouTube/Spotify provider and media ID in the share token. This **does not download music, scrape providers, or upload songs to Vercel Blob**.
- The recipient unlocks the note and chooses whether to load the embedded player. They then click Play inside it. No guaranteed autoplay, Spotify full-song access, looping, or persistent background playback is promised. Some content may refuse embedding or be unavailable by region/account. **Open on YouTube/Spotify** is provided as a fallback.
- Loading a third-party player sends browser data (such as IP address) to that provider. Links are visible to listeners after unlock, but aren't secrets stored by Dearplume.
- The **MP3 upload** mode remains unchanged: maximum 2 MB, private Vercel Blob required only when sharing that MP3.
- Existing local notes, encrypted shares, photos, typing, retention, and backups continue to work. No migration needed.

### Fix: `Module not found: Can't resolve '@vercel/blob'`

The package is already declared in `package.json`, but it must be installed in your checkout. In the project root, run:

```bash
npm install @vercel/blob@^2.8.2
npm run dev
```

This dependency is needed **at build time even if you only use external music links**, because Dearplume still supports uploaded MP3s via `src/lib/musicStorage.ts`. For MP3 sharing, you also need a **private Vercel Blob store** and its credentials. For YouTube and Spotify links, no Blob store or token is required.

## What changed in v0.1.3

- **Theme-linked accents:** The flying-object color now also determines all pink accent text, buttons, tabs, icons, highlights, and focus rings. Text colors are darkened automatically for contrast. The chosen color is copied into each encrypted shared note, so the recipient sees the same theme. Saved settings continue to work.
- **Optional MP3:** Attach a background song (MP3, maximum **2 MB**) when creating or editing a note. It is saved as a Blob in local IndexedDB and included in JSON exports/imports. You can preview it locally. Music is optional; pick either a streaming link or an uploaded MP3.
- **Recipient music player:** When sharing with a song, the API encrypts and uploads the MP3 to a **private Vercel Blob store**. Unlocking uses both credentials and the unexpired share token to retrieve it. The receiver gets play/pause/seek/volume controls with looping. Browsers usually block autoplay with audio, so music starts after the recipient presses **Play**, not automatically.
- **Keep notes local by default:** Media is uploaded only when generating a music-attached link. Notes without music still use stateless URL sharing and need no Blob account.
- **Expired audio cleanup:** `vercel.json` configures a daily cleanup route which requires `CRON_SECRET`. The server rejects expired unlocks even if cleanup hasn't run; the cleanup removes the encrypted stored bytes later.

### One-time setup for sharing MP3s

1. Install dependencies with `npm install` (new dependency: `@vercel/blob`).
2. In Vercel Storage, create a **private** Blob store attached to your Dearplume project. Configure `BLOB_READ_WRITE_TOKEN` in your local `.env.local` and Vercel's environment variables, or use the supported Vercel Blob store environment configuration.
3. Set `CRON_SECRET` to a fresh random secret in Vercel for the daily `/api/music-cleanup` job. Deploy as a Next.js app (not static export).
4. Add your MP3 in the note composer and create a **new** protected link. Links without MP3 continue to work with just `DEARPLUME_SHARE_SECRET`.
5. If the MP3 is larger than 2 MB, trim/compress it before attaching; server uploads have body limits. A 2 MB file is **not** embedded in the URL.

**Storage/privacy:** The original MP3 lives in your local browser. When you share it, the server receives its bytes over HTTPS and encrypts it with AES-256-GCM before storing it in a private Vercel Blob object. Its private pathname is inside the password-protected share token. Authorized recipients can play, download, or record decrypted audio once unlocked. The MP3 remains stored until scheduled cleanup runs; deleting the local note will not revoke an existing share. The music server key depends on `DEARPLUME_SHARE_SECRET`; rotating that secret makes existing links and music unreadable. Vercel Blob may incur storage and transfer charges. Share only audio you have permission to use.

**Compatibility:** Old notes and old shared links remain readable. For old links, appearance behavior remains as it was when those links were generated, while the page's accent styling follows the shared flying color when unlocked.

## Features

| Part | What it does |
| --- | --- |
| Create a note | Title, message, optional YouTube/Spotify track URL or MP3 (2 MB limit), and optional image (JPG/PNG/WebP/GIF, up to 6 MB) |
| Created notes | Appears after the first note is saved. View, edit, delete, share; cards show date and picture |
| Private local storage | Uses browser **IndexedDB** for original notes and images; `localStorage` for preferences |
| Settings | Gear icon next to the tabs: local note retention, **independent** default link expiration, typing speed, page background, flying icon and color |
| Flying decorations | Choose hearts, stars, flowers, sparkles, moons, clouds, gifts or butterflies; they fly **from bottom-right toward upper-left** |
| Local retention | Keep forever or auto-delete notes by creation age after a set number of days, weeks, or 30-day months |
| Secure sharing | Share only one selected note with an AES-256-GCM encrypted, compressed, password-protected URL |
| Password and salt | Enter a password (minimum 12 characters) or generate one. A fresh access salt is created automatically |
| Shared view | Read-only unlock screen. After unlocking, the picture starts in ASCII and transitions to a color image when typing finishes; Show all triggers the reveal and Replay resets it |
| Link expiration | Set minutes, hours, or days; maximum 90 days. The server enforces the expiration on unlock |
| Markdown export | Download a `.md` file containing title, link, password, access salt, expiration time in PHT, and unlock instructions |
| Private backups | Export and import JSON backups including the original photos. Clear Local Data with custom confirmation |
| Responsive UI | Works on phones and desktops, no account required, no external analytics or third-party fonts |

## Tech stack

- Next.js 16.4.3 (App Router), React 19.2, TypeScript, CSS, Lucide icons.
- IndexedDB (local notes + image Blobs), browser localStorage (settings).
- Next.js Node.js API route for encrypting and unlocking **only explicitly shared notes**.
- AES-256-GCM, PBKDF2-SHA256 (220,000 rounds), server-held 32-byte secret, random IV/KDF salt.
- `gzip` to keep encrypted links smaller. Pictures are converted to **ASCII plus a small, downscaled WebP/JPEG preview** in the browser. The preview is encrypted inside the URL; the full-resolution original stays in IndexedDB.

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

**Do not use `output: "export"`.** The API route at `/api/message-share` requires server-side execution. An `out/` folder, if generated manually, cannot provide encrypted link creation/unlock services.

To check changes:

```bash
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
6. The recipient opens `/s#<encrypted-token>`, enters both secrets, and sees ASCII art while the note types. **When the last character appears, the picture fades into its color version.** Show all finishes typing and reveals the picture immediately; Replay restores ASCII and restarts typing.

The image shown after typing is a **compressed color copy**, not the full-resolution original. This is necessary to fit a complete, database-free encrypted share inside the URL. Image details may be reduced. Older links created before v0.1.2 contain ASCII only and continue to show ASCII after typing.

The encrypted token is in the **URL fragment (`#`)**, which is not transmitted in the initial page GET request. On unlock, the browser explicitly sends it to the Dearplume API over HTTPS along with the credentials. The copied link is a **snapshot**; subsequent edits to the local note do not change the recipient's version.

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

The normal composing mode doesn't upload notes or pictures; it uses your browser storage. Sharing is **not fully offline**: the selected message, its ASCII conversion, a downscaled color picture preview (if attached), password, and access salt are sent to your own server endpoint over HTTPS when generating the encrypted snapshot. Unlocking sends the token and credentials to that same endpoint. No database is needed, and the API does not intentionally persist content or credentials.

A stateless link cannot be revoked before expiration without adding a revocation store. Anyone holding the link **and both credentials** can view and save the content before expiration. Expiration doesn't erase content previously viewed or screenshotted. There is **no distributed unlock-attempt rate limiting** in this starter version; add a managed rate limiter/WAF for public deployment. Read [SECURITY.md](SECURITY.md) for security details and limitations.

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
