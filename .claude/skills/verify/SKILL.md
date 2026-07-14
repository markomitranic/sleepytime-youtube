---
name: verify
description: Build, launch and drive this app in a headless browser to verify UI changes end-to-end.
---

# Verifying sleepytime-youtube changes

## Launch

- Dev server needs env vars or `src/env.js` validation kills it. Throwaway
  `.env.local` works (gitignored): set `AUTH_SECRET` (any base64),
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (junk fine).
  `NEXT_PUBLIC_YOUTUBE_API_KEY` optional — without it public playlists won't
  load, but `/player` still renders the deck + home-screen menu, enough for
  chrome/UI work.
- `bun dev` → ready on http://localhost:3000 in ~2s.

## Drive (headless)

- Install `playwright-core` in the scratchpad (NOT the repo) and launch with
  `executablePath` pointing at the preinstalled Chromium under
  `$PLAYWRIGHT_BROWSERS_PATH` (`/opt/pw-browsers/chromium-*/chrome-linux/chrome`
  — glob it, version suffix varies). Never `playwright install`.
- Gotcha: first visit shows the cookie banner (`.fixed.bottom-20`) which
  intercepts clicks near the bottom-right — accept it before driving.
- Useful hooks: deck keys have aria-labels ("Open playlists", "Next video");
  the Playlists key reflects tray state via `aria-pressed`; screen glass is
  `[data-player-screen]`.

## Flows worth driving

- `/player` (no playlist): deck renders, LCD indicators, trays open/close.
- `/` homepage → tapping a program slot folds into the player.
- Lock: LCD LOCK indicator → clamshell closes, all input dead, slide (or
  ArrowRight x4 on the knob) to unlock.
