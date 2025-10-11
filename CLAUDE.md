# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sleepytime YouTube is a Next.js application that allows users to play YouTube playlists one video at a time, with sleep timer functionality. The application supports both public playlists (via API key) and authenticated user playlists (via Google OAuth). It's a client-side focused app deployed on Vercel with minimal server-side logic.

## Commands

**Development:**
- `pnpm dev` — Start development server with Turbo mode
- `pnpm build` — Production build
- `pnpm preview` — Build and preview production locally
- `pnpm start` — Start production server
- `pnpm typecheck` — Run TypeScript type checking (no `pnpm lint` configured)

**Package Manager:**
- Always use `pnpm` (version 10.14.0)
- Check for similar packages before installing new ones

## Architecture

### Tech Stack
- **Next.js 15** (App Router, TypeScript, React 19)
- **Tailwind CSS v4** — All config in `src/styles/globals.css`, no `tailwind.config.js`
- **TanStack React Query** — Client-side data fetching and caching
- **Auth.js v5** (NextAuth) — Google OAuth with YouTube API scopes
- **shadcn/ui** — UI components in `src/components/ui`
- **React Hook Form** — Forms (minimal usage currently)
- **dnd-kit** — Drag-and-drop for playlist reordering

### App Structure

**Pages (App Router):**
- `/` (`src/app/page.tsx`) — Homepage with built-in playlists and user playlists
- `/player` (`src/app/player/page.tsx`) — Video player page
- `/organize` (`src/app/organize/page.tsx`) — Playlist management/editing page

**API Routes:**
- `/api/auth/[...nextauth]/route.ts` — Auth.js handlers
- `/api/builtin-playlists/route.ts` — Server-cached built-in playlist metadata (72-hour cache)
- `/api/wayback/route.ts` — Wayback Machine API proxy for recovering deleted videos

### Provider Hierarchy

The app wraps children in this provider order (see `src/app/providers.tsx` and `src/app/layout.tsx`):
1. `QueryClientProvider` — TanStack Query with optimized cache settings
2. `SessionProvider` — NextAuth session management
3. `AuthProvider` — Custom auth context (`src/components/auth/AuthContext.tsx`)
4. `PlaylistProvider` — Playlist state management (`src/components/playlist/PlaylistContext.tsx`)
5. `PlayerProvider` — Video player state (`src/components/playlist/PlayerContext.tsx`)

### Key Contexts

**AuthContext** (`src/components/auth/AuthContext.tsx`):
- Provides `useAuth()` hook
- Exposes: `isReady`, `isAuthenticated`, `accessToken`, `error`, `user`, `signIn()`, `signOut()`, `getTokenSilently()`
- Handles automatic token refresh via Auth.js

**PlaylistContext** (`src/components/playlist/PlaylistContext.tsx`):
- Provides `usePlaylist()` hook
- Manages playlist loading, video selection, item reordering/deletion, sleep timer
- Syncs state to localStorage and URL params (`?list=`, `?v=`)
- Progressive loading with page count tracking

**PlayerContext** (`src/components/playlist/PlayerContext.tsx`):
- Provides `usePlayer()` hook
- Manages YouTube IFrame Player instance and playback state
- Handles autoplay to next video, repeat modes, sleep timer integration

### YouTube API Integration

**Core Functions** (`src/lib/youtube.ts`):
- `fetchPlaylistItems()` — Fetch videos from a playlist (paginated, max 50/page)
- `fetchPlaylistSnippet()` — Fetch playlist metadata (title, itemCount)
- `fetchUserPlaylists()` — Fetch authenticated user's playlists
- `fetchPlaylistsByIds()` — Fetch metadata for specific playlist IDs (for built-in playlists)
- `fetchVideoDurations()` — Fetch video durations in seconds
- `fetchVideosByIds()` — Fetch video metadata by IDs
- `addVideoToPlaylist()` — Add video to playlist (requires auth)
- `deletePlaylistItem()` — Remove item from playlist (requires auth)
- `updatePlaylistItemPosition()` — Reorder playlist items (requires auth)

**Authentication Strategy:**
- All YouTube functions accept both `apiKey` (public) and `accessToken` (authenticated) parameters
- Functions automatically retry with API key if authorized request returns 401
- `refreshToken` callback parameter enables automatic token refresh on 401 errors
- Special playlist IDs (LL*, WL*, HL*, RD*, FL*) are filtered via `isUnsupportedUserPlaylistId()`

### Environment Variables

Validated in `src/env.js` using `@t3-oss/env-nextjs`:

**Server-side:**
- `AUTH_SECRET` — Generate with `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` — Google OAuth client ID
- `AUTH_GOOGLE_SECRET` — Google OAuth client secret

**Client-side:**
- `NEXT_PUBLIC_YOUTUBE_API_KEY` — YouTube Data API v3 key (optional, for public playlists)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Legacy (optional, kept for backwards compatibility)

### Authentication Flow

1. User clicks "Sign in with Google" → triggers NextAuth Google provider
2. Auth.js (`auth.ts`) requests YouTube scopes: `youtube`, `youtube.readonly`
3. Access token stored in JWT, exposed via session
4. `AuthContext` provides `getTokenSilently()` which returns fresh token
5. Token refresh handled automatically in `auth.ts` JWT callback
6. On 401 errors, YouTube functions call `refreshToken` callback and retry

### State Management Patterns

**React Query:**
- Shared queries via `src/lib/queries.ts` (e.g., `useBuiltinPlaylists`)
- Aggressive caching for built-in playlists (24h stale time, 7d gc time)
- Query client configured with reduced refetch intervals (5min stale, 30min gc)

**localStorage Persistence:**
- Playlist state persisted to `sleepytime-playlist` key
- Includes `playlistId`, `currentVideoId`, `url`
- Auto-restores on player page load

**URL Sync:**
- `?list=` parameter for playlist ID
- `?v=` parameter for current video ID
- Document title syncs to playlist title

### Component Patterns

**Early Returns:**
- Prefer early returns to reduce nesting

**Function Declarations:**
- Use `function` keyword for components, not `const` assignments

**Imports:**
- No barrel exports or default exports — use named exports
- Direct imports with destructuring: `import { Component } from "~/path/to/Component"`

**React Hook Form:**
- Always use `useWatch` with `exact: true` for performance
- Use dot-separated property names directly (e.g., `"filters.field"`)

### Styling

- **Tailwind v4** — All configuration in `src/styles/globals.css`
- No `tailwind.config.js` file
- Dark mode always enabled via `className="dark"` on root `<html>`
- CSS Modules only for animations, prefer Tailwind for styling

### Built-in Playlists

Hardcoded playlist IDs in `src/app/api/builtin-playlists/route.ts`:
- Server-side cached for 72 hours
- Fetched via `useBuiltinPlaylists()` hook from `src/lib/queries.ts`
- Displayed on homepage in `BuiltinPlaylistGrid` component

### Sleep Timer Feature

- Managed in `PlaylistContext` via `sleepTimer` state
- Countdown updates every second
- On expiry: sets `isPaused: true` and `sleepTimer.expired: true`
- Player responds to `isPaused` flag to pause video
- User can prolong timer or dismiss via `SleepTimerDrawer`

### Progressive Playlist Loading

- `PlaylistContext.loadByPlaylistId()` fetches pages sequentially
- Updates `loading` state with `pagesLoaded`, `itemsLoaded`, `totalPages`, `totalItems`
- UI shows progress indicator during load
- Fetches snippet first to get total count, then paginates items

### Drag & Drop Reordering

- Uses `@dnd-kit/core` and `@dnd-kit/sortable`
- On drop, optimistically updates local state
- Calls YouTube API `updatePlaylistItemPosition()` with auth token
- Falls back to `refreshItemsOnce()` after API call to ensure consistency

### Video Duration Tracking

- Fetched in batches (max 50 video IDs per request) via `fetchVideoDurations()`
- Durations stored as `durationSeconds` on `YouTubePlaylistItem` objects
- Used for total playlist duration calculations

### Error Handling

- 401 errors trigger automatic token refresh + retry
- 404/NotFound errors clear playlist state and redirect to homepage
- Auth errors show toast and sign user out
- Playlist loading errors display friendly messages with raw error details

### Component Organization

- `src/components/ui/` — shadcn/ui base components
- `src/components/auth/` — Authentication components (AccountDrawer, AuthContext, SessionProvider)
- `src/components/playlist/` — Playlist/player components (Player, PlaylistGrid, PlaylistSwitcherDrawer, etc.)
- `src/components/organize/` — Playlist editing components (PlaylistDetail, ReplaceVideoDrawer, ManualSearchDialog)
- `src/components/BottomNav.tsx` — Mobile navigation
- `src/components/CookieBanner.tsx` — Cookie consent

### PWA Support

- Service worker registered in `src/app/layout.tsx`
- Manifest at `/public/manifest.json`
- Icons at `/public/icon-192.png`, `/public/icon-512.png`
- Apple-specific meta tags for iOS home screen support

### Known Limitations

- Some playlist IDs are unsupported by YouTube Data API (Watch Later, Liked Videos, History, Mixes)
- These are filtered out via `isUnsupportedUserPlaylistId()` in `src/lib/youtube.ts`

### Testing

- No test infrastructure currently configured
- TypeScript type checking via `pnpm typecheck`

## Development Workflow

1. Run `pnpm dev` to start development server
2. Edit files — hot reload enabled with Turbo mode
3. Run `pnpm typecheck` before committing
4. Environment variables must be set in `.env.local` (see `.env.example`)

## Deployment

- Deployed on Vercel
- Set environment variables in Vercel project settings
- Automatic deployments on `main` branch push
- Preview deployments on pull requests
