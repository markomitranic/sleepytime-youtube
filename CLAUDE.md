# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sleepytime YouTube is a Next.js application that plays YouTube playlists one video at a time, with sleep timer functionality. It supports both public playlists (via API key) and authenticated user playlists (via Google OAuth). It's a client-side focused app deployed on Vercel with minimal server-side logic (server only needed for OAuth via Auth.js).

## Commands

**Development:**
- `bun dev` — Start development server with Turbo mode
- `bun run build` — Production build
- `bun run preview` — Build and preview production locally
- `bun start` — Start production server
- `bun run typecheck` — Run TypeScript type checking (no `bun lint` configured)

**Package Manager:**
- Always use `bun` (version 1.3.6)
- Check for similar packages before installing new ones

## Architecture

### Tech Stack
- **Next.js 15** (App Router, TypeScript, React 19)
- **Tailwind CSS v4** — All config in `src/styles/globals.css`, no `tailwind.config.js`
- **TanStack React Query** — Client-side data fetching and caching
- **Auth.js v5** (NextAuth) — Google OAuth with YouTube API scopes
- **shadcn/ui** — UI components in `src/components/ui`
- **dnd-kit** — Drag-and-drop for playlist reordering

### App Structure

**Pages (App Router):**
- `/` (`src/app/page.tsx`) — Homepage with built-in playlists and user playlists
- `/player` (`src/app/player/page.tsx`) — Video player page

**API Routes:**
- `/api/auth/[...nextauth]/route.ts` — Auth.js handlers
- `/api/builtin-playlists/route.ts` — Server-cached built-in playlist metadata (7-day cache)

### Provider Hierarchy

The app wraps children in this provider order (see `src/app/providers.tsx`):
1. `QueryClientProvider` — TanStack Query with optimized cache settings
2. `SessionProvider` — NextAuth session management (from `next-auth/react`)
3. `PlaylistProvider` — Playlist state management (`src/components/playlist/PlaylistContext.tsx`)

Note: `PlayerProvider` wraps the player page specifically, not the entire app.

### Key Hooks & Contexts

**`useAuth()`** (`src/components/auth/AuthContext.tsx`):
- Plain hook wrapping `useSession()` from next-auth — no Context/Provider needed
- Exposes: `isReady`, `isAuthenticated`, `accessToken`, `error`, `user`, `signIn()`, `signOut()`, `getTokenSilently()`

**`usePlaylist()`** (`src/components/playlist/PlaylistContext.tsx`):
- Context-based hook for playlist state management
- Manages playlist loading, video selection, item reordering/deletion
- Delegates sleep timer to `useSleepTimer` hook and URL sync to `useUrlSync` hook
- Persists state to localStorage, progressive loading with page count tracking

**`usePlayer()`** (`src/components/playlist/PlayerContext.tsx`):
- Context-based hook for YouTube IFrame Player instance and playback state
- Manages video progress tracking with localStorage persistence

**`useSleepTimer()`** (`src/lib/useSleepTimer.ts`):
- Standalone hook for sleep timer countdown logic
- Manages timer state, countdown interval, expiry, and pause/prolong actions

**`useUrlSync()`** (`src/lib/useUrlSync.ts`):
- Syncs playlist state to URL params (`?list=`, `?v=`) and document title

### YouTube API Integration

**Core Functions** (`src/lib/youtube.ts`):
- `fetchPlaylistItems()` — Fetch videos from a playlist (paginated, max 50/page)
- `fetchPlaylistSnippet()` — Fetch playlist metadata (title, itemCount)
- `fetchUserPlaylists()` — Fetch authenticated user's playlists
- `fetchPlaylistsByIds()` — Fetch metadata for specific playlist IDs
- `fetchVideoDurations()` — Fetch video durations in seconds
- `fetchVideosByIds()` — Fetch video metadata by IDs
- `addVideoToPlaylist()` — Add video to playlist (requires auth)
- `deletePlaylistItem()` — Remove item from playlist (requires auth)
- `updatePlaylistItemPosition()` — Reorder playlist items (requires auth)

**Shared `youtubeFetch()` utility** handles the repeated auth pattern:
- Adds API key or Authorization header
- On 401: refreshes token and retries, then falls back to API key
- Used by all YouTube API functions

**Unsupported Playlists:**
- Special playlist IDs (LL*, WL*, HL*, RD*, FL*) filtered via `isUnsupportedUserPlaylistId()`

### Environment Variables

Set in `.env.local` (see `.env.example`). Accessed via `process.env` directly.

**Server-side:**
- `AUTH_SECRET` — Generate with `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` — Google OAuth client ID
- `AUTH_GOOGLE_SECRET` — Google OAuth client secret

**Client-side:**
- `NEXT_PUBLIC_YOUTUBE_API_KEY` — YouTube Data API v3 key (optional, for public playlists)

### State Management Patterns

**React Query:**
- Shared queries via `src/lib/queries.ts` (e.g., `useBuiltinPlaylists`)
- Aggressive caching for built-in playlists (24h stale time, 7d gc time)

**localStorage Persistence:**
- Playlist state persisted to `sleepytime-playlist` key
- Video progress persisted to `sleepytime-video-progress` key
- Auto-restores on player page load

### Component Patterns

- Prefer early returns to reduce nesting
- Use `function` keyword for components, not `const` assignments
- Named exports only — no barrel exports or default exports

### Styling

- **Tailwind v4** — All configuration in `src/styles/globals.css`
- No `tailwind.config.js` file
- Dark mode always enabled via `className="dark"` on root `<html>`

### Component Organization

- `src/components/ui/` — shadcn/ui base components
- `src/components/auth/` — Authentication components (AccountDrawer, AuthContext)
- `src/components/playlist/` — Playlist/player components (Player, SortablePlaylistItem, SleepTimerDrawer, SleepTimerExpiryOverlay, PlaylistSwitcherDrawer, etc.)
- `src/components/BottomNav.tsx` — Mobile navigation
- `src/components/CookieBanner.tsx` — Cookie consent
- `src/lib/` — Utilities and hooks (youtube.ts, formatTime.ts, useSleepTimer.ts, useUrlSync.ts, queries.ts, builtinPlaylists.ts)

### Sleep Timer Feature

- Managed via `useSleepTimer` hook (used by PlaylistContext)
- Countdown updates every second
- On expiry: sets `isPaused: true` and `sleepTimer.expired: true`
- When sleep timer is active and a video ends, auto-removes and advances (no dialog)
- When sleep timer is NOT active and video ends, shows "Remove & Play Next" / "Dismiss" dialog
- User can prolong timer or dismiss via `SleepTimerDrawer` (auto-closes on confirm)

### PWA Support

- Manifest at `/public/manifest.json`
- Icons at `/public/icon-192.png`, `/public/icon-512.png`
- Apple-specific meta tags for iOS home screen support

### Testing

- No test infrastructure currently configured
- TypeScript type checking via `bun run typecheck`

## Development Workflow

1. Run `bun dev` to start development server
2. Edit files — hot reload enabled with Turbo mode
3. Run `bun run typecheck` before committing
4. Environment variables must be set in `.env.local` (see `.env.example`)

## Deployment

- Deployed on Vercel
- Set environment variables in Vercel project settings
- Automatic deployments on `main` branch push
- Preview deployments on pull requests
