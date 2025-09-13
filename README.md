# Sleepytime YouTube

Play a YouTube playlist one video at a time. Pure client-side Next.js app deployed on Vercel.

https://sleepytime-youtube.vercel.app/?list=PLPX6lu9kG1JXEdTsF1GSWzZ8qQA_3aUMs

## Tech Stack

- Next.js (App Router, TypeScript) — `src/app`
- Tailwind CSS v4 — `src/styles/globals.css` (no config file)
- shadcn/ui components — `src/components/ui`
- TanStack React Query — client data fetching
- React Hook Form — forms (for future enhancements)

## Architecture

- Single page at `/` (`src/app/page.tsx`). No server routes, no databases, no tRPC.
- Dark mode is always on via `className="dark"` on the root `html` (`src/app/layout.tsx`).
- React Query provider lives in `src/app/providers.tsx` and is wired in `src/app/layout.tsx`.
- YouTube helpers in `src/lib/youtube.ts`:
  - `extractPlaylistIdFromUrl(input)` — parses the `list` param.
  - `fetchPlaylistItems({ apiKey, playlistId, pageToken })` — pages through YouTube Data API v3 `playlistItems` and maps id/title/thumbnail/videoId.
  - `fetchPlaylistSnippet({ apiKey, playlistId })` — fetches playlist title (optional display).
- Environment variables are validated in `src/env.js`. Client-side key is `NEXT_PUBLIC_YOUTUBE_API_KEY`.

Flow on the homepage:
1. User pastes a playlist URL containing `?list=...`.
2. We extract `playlistId` and fetch items with React Query.
3. Items are rendered in a responsive list with thumbnails and titles.

## Local Development

```bash
pnpm i
pnpm dev
```

Other commands:

- `pnpm build` — production build
- `pnpm lint` — project linting/type checks

If you see a prompt about ignored build scripts (e.g., `@tailwindcss/oxide`, `sharp`), you can run:

```bash
pnpm approve-builds
```

## Environment Variables

Create a `.env.local` in the project root:

```
NEXT_PUBLIC_YOUTUBE_API_KEY=YOUR_KEY_HERE
```

The app reads it via `src/env.js`. Because this is a pure client app, the key is exposed in the browser — this is expected for public YouTube data. We lock it down via referrer and API restrictions (see below).

## Getting a YouTube Data API v3 Key (and Securing It)

1. Enable the API
   - Go to Google Cloud Console → APIs & Services → Library.
   - Search for “YouTube Data API v3” and click “Enable”.

2. Create the key
   - APIs & Services → Credentials → Create credentials → API key.

3. Restrict the key
   - Application restrictions: choose “HTTP referrers (web sites)”. Add:
     - `http://localhost:3000/*`
     - `https://your-vercel-domain.vercel.app/*`
   - API restrictions: “Restrict key” → select “YouTube Data API v3”.

4. Add to the app
   - Local: put the key in `.env.local` as `NEXT_PUBLIC_YOUTUBE_API_KEY` and restart `pnpm dev`.
   - Production (Vercel): Project → Settings → Environment Variables → add `NEXT_PUBLIC_YOUTUBE_API_KEY` for Production/Preview.

### Why a public (browser) key is acceptable here

- We only access public data (playlists and items).
- Referrer restriction ensures only requests from your origins are honored.
- API restriction blocks other Google APIs from using this key.
- You can rotate the key at any time if needed.

### Alternatives

- Serverless proxy (keeps the key secret): Add an API route or serverless function that calls YouTube, and the client calls your endpoint. This avoids exposing the key, but adds server code. We intentionally keep this project client-only.
- RSS feed fallback (keyless): `https://www.youtube.com/feeds/videos.xml?playlist_id=...` — limited fields, potential CORS issues, and may not return full playlists.

## Deployment

- Deploy on Vercel. Set `NEXT_PUBLIC_YOUTUBE_API_KEY` in the project settings.
- The app is a single page and requires no server-side code.

## File Map (key parts)

- `src/app/layout.tsx` — sets `html.dark` and wraps with React Query provider
- `src/app/page.tsx` — input + fetching + rendering
- `src/app/providers.tsx` — `QueryClientProvider`
- `src/lib/youtube.ts` — YouTube URL parsing and fetchers
- `src/styles/globals.css` — Tailwind v4 and theme variables
- `src/components/ui/input.tsx` — shadcn Input component

