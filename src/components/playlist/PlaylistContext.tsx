"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import type { YouTubePlaylistItem, YouTubePlaylistSnippet } from "~/lib/youtube";
import { env } from "~/env";
import { useAuth } from "~/components/auth/useAuth";
import { fetchPlaylistItems, fetchPlaylistSnippet, fetchVideoDurations } from "~/lib/youtube";
import { toast } from "sonner";

type PersistedPlaylistState = {
  playlistId?: string;
  currentVideoId?: string;
  url?: string;
};

export type SleepTimer = {
  isActive: boolean;
  durationMinutes: number;
  startTime?: number;
  remainingSeconds?: number;
  expired?: boolean;
};

export type PlaylistState = {
  url?: string;
  playlistId?: string;
  snippet?: YouTubePlaylistSnippet | null;
  items: YouTubePlaylistItem[];
  currentVideoId?: string;
  isLoading?: boolean;
  loading?: {
    pagesLoaded: number;
    totalPages?: number;
    itemsLoaded: number;
    totalItems?: number;
  } | null;
  error?: string | null;
  errorDetails?: string | null;
  sleepTimer: SleepTimer;
  isPaused?: boolean; // New field to track if video is paused by sleep
  darker?: boolean; // New field to track if aurora animation should be hidden
};

export type PlaylistActions = {
  loadPlaylist: (params: {
    url: string;
    playlistId: string;
    snippet: YouTubePlaylistSnippet | null;
    items: YouTubePlaylistItem[];
    currentVideoId?: string;
  }) => void;
  loadByPlaylistId: (playlistId: string) => Promise<void>;
  setCurrentVideoId: (videoId: string | undefined) => void;
  clear: () => void;
  setSleepTimer: (durationMinutes: number) => void;
  deactivateSleepTimer: () => void;
  dismissSleepExpiry: () => void;
  prolongSleepTimer: (additionalMinutes: number) => void;
  triggerSleep: () => void;
  toggleDarker: () => void;
  reloadPlaylist: () => Promise<void>;
  reorderItem: (videoId: string, direction: "up" | "down") => void;
  removeItem: (videoId: string) => void;
  refreshItemsOnce: (opts?: { delayMs?: number }) => Promise<void>;
};

const PlaylistContext = createContext<(PlaylistState & PlaylistActions) | null>(null);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [persistedState, setPersistedState] = useLocalStorage<PersistedPlaylistState | null>(
    "sleepytime-playlist",
    null
  );
  const [state, setState] = useState<PlaylistState>({ 
    items: [], 
    sleepTimer: { isActive: false, durationMinutes: 30 },
    isPaused: false,
    darker: false
  });
  const loadAbortRef = useRef<AbortController | null>(null);
  const hasInitializedFromStorage = useRef(false);
  const auth = useAuth();

  // Stable ref for auth.getTokenSilently to avoid recreating actions
  const getTokenSilentlyRef = useRef(auth.getTokenSilently);
  useEffect(() => {
    getTokenSilentlyRef.current = auth.getTokenSilently;
  }, [auth.getTokenSilently]);

  const actions: PlaylistActions = useMemo(
    () => ({
      loadPlaylist: ({ url, playlistId, snippet, items, currentVideoId }) => {
        setState((prev) => {
          // Prefer provided currentVideoId if valid in new items
          const provided = currentVideoId && items.some((i) => i.videoId === currentVideoId) ? currentVideoId : undefined;
          // Otherwise, keep previous selection if it still exists in new items
          const preserved = prev.currentVideoId && items.some((i) => i.videoId === prev.currentVideoId) ? prev.currentVideoId : undefined;
          // Fallback to first available
          const fallback = items.find((i) => Boolean(i.videoId))?.videoId;
          return {
            ...prev,
            url,
            playlistId,
            snippet,
            items,
            currentVideoId: provided ?? preserved ?? fallback,
            isLoading: false,
            error: null,
            errorDetails: null,
            sleepTimer: prev.sleepTimer, // Preserve existing sleep timer state
            darker: prev.darker, // Preserve existing darker state
          };
        });
      },
      loadByPlaylistId: async (playlistId) => {
        try {
          // Abort any existing load
          if (loadAbortRef.current) {
            try { loadAbortRef.current.abort(); } catch {}
          }

          const controller = new AbortController();
          loadAbortRef.current = controller;

          setState((s) => ({
            ...s,
            isLoading: true,
            error: null,
            errorDetails: null,
            playlistId,
            items: [],
            loading: { pagesLoaded: 0, itemsLoaded: 0, totalPages: undefined, totalItems: undefined },
          }));
          // Snap viewport to top so the player area is visible immediately
          if (typeof window !== "undefined") {
            try { window.scrollTo(0, 0); } catch {}
          }
          // Ensure we have a fresh token ONLY if already authenticated (avoid prompting on public playlists)
          if (auth.isAuthenticated && getTokenSilentlyRef.current) {
            try { await getTokenSilentlyRef.current(); } catch {}
          }
          // Fetch snippet early for title and total count
          const snippet = await fetchPlaylistSnippet({
            apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
            accessToken: auth.accessToken,
            playlistId,
            signal: loadAbortRef.current?.signal,
            refreshToken: getTokenSilentlyRef.current,
          });

          setState((s) => ({
            ...s,
            snippet: snippet ?? null,
            loading: {
              pagesLoaded: 0,
              itemsLoaded: 0,
              totalItems: snippet?.itemCount,
              totalPages: typeof snippet?.itemCount === "number" ? Math.ceil(Math.max(0, snippet.itemCount) / 50) : undefined,
            },
          }));

          // Aggregate items across pages, progressively updating state
          let nextPageToken: string | undefined = undefined;
          const aggregated: YouTubePlaylistItem[] = [];
          do {
            const res = await fetchPlaylistItems({
              apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
              accessToken: auth.accessToken,
              playlistId,
              pageToken: nextPageToken,
              signal: loadAbortRef.current?.signal,
              refreshToken: getTokenSilentlyRef.current,
            });
            aggregated.push(...res.items);
            nextPageToken = res.nextPageToken;
            setState((s) => ({
              ...s,
              items: aggregated.slice(),
              loading: {
                pagesLoaded: (s.loading?.pagesLoaded ?? 0) + 1,
                itemsLoaded: aggregated.length,
                totalItems: s.loading?.totalItems,
                totalPages: s.loading?.totalPages,
              },
            }));
          } while (nextPageToken);

          // Fetch video durations
          const videoIds = aggregated.filter(item => item.videoId).map(item => item.videoId!);
          if (videoIds.length > 0) {
            try {
              const durations = await fetchVideoDurations({
                apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
                accessToken: auth.accessToken,
                videoIds,
                refreshToken: getTokenSilentlyRef.current,
              });
              // Merge durations into items
              aggregated.forEach(item => {
                if (item.videoId && durations.has(item.videoId)) {
                  item.durationSeconds = durations.get(item.videoId);
                }
              });
            } catch (e) {
              console.warn("Failed to fetch video durations", e);
            }
          }

          // Use ?v from URL if valid as initial selection
          const v = typeof window !== "undefined" ? new URL(window.location.href).searchParams.get("v") ?? undefined : undefined;
          const initialFromParam = v && aggregated.some((i) => i.videoId === v) ? v : undefined;

          actions.loadPlaylist({
            url: `https://www.youtube.com/playlist?list=${playlistId}`,
            playlistId,
            snippet: snippet ?? null,
            items: aggregated,
            currentVideoId: initialFromParam,
          });
        } catch (e) {
          if ((e as any)?.name === "AbortError") {
            // Swallow abort
            return;
          }
          const raw = (e as Error)?.message ?? "Failed to load playlist.";
          const lower = raw.toLowerCase();
          const isNotFound = (lower.includes("playlistnotfound") || lower.includes("cannot be found") || lower.includes("404"));
          const isUnauthorized = (e as any)?.status === 401 || lower.includes("401");
          const friendly = isNotFound
            ? "Couldn't load this playlist. If it's private, ensure you're signed into the same YouTube account that owns it and try refreshing the playlists."
            : (raw || "Failed to load playlist.");
          setState((s) => ({
            ...s,
            isLoading: false,
            loading: null,
            error: friendly,
            errorDetails: raw,
            // If not found, snap back to homepage state but keep the error so Sonner shows
            playlistId: isNotFound ? undefined : s.playlistId,
            items: isNotFound ? [] : s.items,
          }));
          if (isNotFound && typeof window !== "undefined") {
            try {
              const urlObj = new URL(window.location.href);
              urlObj.searchParams.delete("list");
              urlObj.searchParams.delete("v");
              const newQuery = urlObj.searchParams.toString();
              const href = newQuery ? `${urlObj.pathname}?${newQuery}` : urlObj.pathname;
              window.history.replaceState(null, "", href);
            } catch {}
            // Clear localStorage when playlist is not found to prevent infinite 404 loops
            setPersistedState(null);
          }
          // If 401 or not found and the user appears signed in, sign them out to clear bad/expired token
          try {
            if ((isUnauthorized || isNotFound) && (auth as any)?.isAuthenticated && (auth as any)?.signOut) {
              try { toast.error("Your session expired. You’ve been signed out."); } catch {}
              (auth as any).signOut();
            }
          } catch {}
        }
      },
      setCurrentVideoId: (videoId) => setState((s) => ({ ...s, currentVideoId: videoId, isPaused: false })), // Resume when selecting a video
      clear: () => {
        if (loadAbortRef.current) {
          try { loadAbortRef.current.abort(); } catch {}
          loadAbortRef.current = null;
        }
        setState({ items: [], sleepTimer: { isActive: false, durationMinutes: 30 }, isPaused: false, darker: false });
        setPersistedState(null); // Clear localStorage
        if (typeof window !== "undefined") {
          const urlObj = new URL(window.location.href);
          urlObj.searchParams.delete("list");
          urlObj.searchParams.delete("v");
          const newQuery = urlObj.searchParams.toString();
          const href = newQuery ? `${urlObj.pathname}?${newQuery}` : urlObj.pathname;
          window.history.replaceState(null, "", href);
        }
      },
      setSleepTimer: (durationMinutes: number) => {
        setState(s => ({
          ...s,
          sleepTimer: {
            isActive: true,
            durationMinutes,
            startTime: Date.now(),
            remainingSeconds: durationMinutes * 60,
          }
        }));
      },
      deactivateSleepTimer: () => {
        setState(s => ({
          ...s,
          sleepTimer: { isActive: false, durationMinutes: s.sleepTimer.durationMinutes, expired: false }
        }));
      },
      dismissSleepExpiry: () => {
        setState(s => ({
          ...s,
          sleepTimer: { ...s.sleepTimer, expired: false, isActive: false }
        }));
      },
      prolongSleepTimer: (additionalMinutes: number) => {
        setState(s => ({
          ...s,
          sleepTimer: {
            isActive: true,
            durationMinutes: additionalMinutes,
            startTime: Date.now(),
            remainingSeconds: additionalMinutes * 60,
            expired: false,
          }
        }));
      },
      triggerSleep: () => {
        // Sleep action: pause video playback and show expiry dialog
        setState(s => ({
          ...s,
          isPaused: true,
          sleepTimer: { ...s.sleepTimer, isActive: false, expired: true }
        }));
      },
      toggleDarker: () => {
        setState(s => ({ ...s, darker: !s.darker }));
      },
      reloadPlaylist: async () => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
      reorderItem: (videoId, direction) => {
        setState((prev) => {
          const items = prev.items.slice();
          const currentIndex = items.findIndex((i) => i.videoId === videoId);
          if (currentIndex === -1) return prev;
          // Find the nearest neighbor in the requested direction that has a videoId
          let targetIndex = currentIndex;
          if (direction === "up") {
            for (let i = currentIndex - 1; i >= 0; i--) {
              if (items[i]?.videoId) { targetIndex = i; break; }
            }
          } else {
            for (let i = currentIndex + 1; i < items.length; i++) {
              if (items[i]?.videoId) { targetIndex = i; break; }
            }
          }
          if (targetIndex === currentIndex) return prev;
          const updated = items.slice();
          const removed = updated.splice(currentIndex, 1);
          const moved = removed[0];
          if (!moved) return prev;
          updated.splice(targetIndex, 0, moved);
          return { ...prev, items: updated };
        });
      },
      removeItem: (videoId) => {
        setState((prev) => {
          const updated = prev.items.filter((i) => i.videoId !== videoId);
          const nextCurrent = prev.currentVideoId === videoId
            ? (updated.find((i) => Boolean(i.videoId))?.videoId)
            : prev.currentVideoId;
          return { ...prev, items: updated, currentVideoId: nextCurrent };
        });
      },
      refreshItemsOnce: async ({ delayMs = 700 }: { delayMs?: number } = {}) => {
        // Re-fetch items once after a small delay to let YouTube apply the reorder
        const playlistId = state.playlistId;
        if (!playlistId) return;
        await new Promise((r) => setTimeout(r, Math.max(0, delayMs)));
        try {
          const aggregated: YouTubePlaylistItem[] = [];
          let nextPageToken: string | undefined = undefined;
          do {
            const res = await fetchPlaylistItems({
              apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
              accessToken: auth.accessToken,
              playlistId,
              pageToken: nextPageToken,
              refreshToken: getTokenSilentlyRef.current,
            });
            aggregated.push(...res.items);
            nextPageToken = res.nextPageToken;
          } while (nextPageToken);
          setState((s) => ({ ...s, items: aggregated }));
        } catch {
          // ignore
        }
      },
    }),
    [auth.isAuthenticated, auth.accessToken],
  );

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  // Sync current video to URL (?v=) once selection exists
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state.playlistId) return;
    const nextId = state.currentVideoId;
    if (!nextId) return;
    const urlObj = new URL(window.location.href);
    const currentParam = urlObj.searchParams.get("v");
    if (currentParam === nextId) return;
    urlObj.searchParams.set("v", nextId);
    const newQuery = urlObj.searchParams.toString();
    const href = newQuery ? `${urlObj.pathname}?${newQuery}` : urlObj.pathname;
    window.history.replaceState(null, "", href);
  }, [state.playlistId, state.currentVideoId]);

  // Sync document title to reflect playlist title when a playlist is opened
  useEffect(() => {
    if (typeof document === "undefined") return;
    const baseTitle = "Sleepytime-YouTube";
    const playlistTitle = state.snippet?.title?.trim();
    if (state.playlistId && playlistTitle) {
      document.title = `${baseTitle} - ${playlistTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [state.playlistId, state.snippet?.title]);

  // Sync playlist id to URL (?list=)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state.playlistId) return;
    const urlObj = new URL(window.location.href);
    const currentList = urlObj.searchParams.get("list");
    if (currentList === state.playlistId) return;
    urlObj.searchParams.set("list", state.playlistId);
    const newQuery = urlObj.searchParams.toString();
    const href = newQuery ? `${urlObj.pathname}?${newQuery}` : urlObj.pathname;
    window.history.replaceState(null, "", href);
  }, [state.playlistId]);

  // Sleep Timer countdown logic
  useEffect(() => {
    if (!state.sleepTimer.isActive || !state.sleepTimer.startTime) return;

    const interval = setInterval(() => {
      setState(prev => {
        if (!prev.sleepTimer.isActive || !prev.sleepTimer.startTime) return prev;

        const elapsed = Math.floor((Date.now() - prev.sleepTimer.startTime) / 1000);
        const totalSeconds = prev.sleepTimer.durationMinutes * 60;
        const remainingSeconds = Math.max(0, totalSeconds - elapsed);

        if (remainingSeconds <= 0) {
          // Timer expired - trigger sleep action
          setTimeout(() => actions.triggerSleep(), 0);
          return prev;
        }

        return {
          ...prev,
          sleepTimer: {
            ...prev.sleepTimer,
            remainingSeconds
          }
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.sleepTimer.isActive, state.sleepTimer.startTime]);

  // Persist playlist state to localStorage whenever it changes
  useEffect(() => {
    if (state.playlistId) {
      setPersistedState({
        playlistId: state.playlistId,
        currentVideoId: state.currentVideoId,
        url: state.url,
      });
    }
  }, [state.playlistId, state.currentVideoId, state.url, setPersistedState]);

  // Initialize from URL if ?list= is present, or from localStorage if not
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!auth.isReady) return;
    if (hasInitializedFromStorage.current) return;
    
    hasInitializedFromStorage.current = true;
    
    const urlObj = new URL(window.location.href);
    const listFromUrl = urlObj.searchParams.get("list");
    
    // URL parameter takes precedence over localStorage
    if (listFromUrl) {
      actions.loadByPlaylistId(listFromUrl);
    } else if (persistedState?.playlistId) {
      // Restore from localStorage if no URL parameter
      actions.loadByPlaylistId(persistedState.playlistId);
    }
  }, [auth.isReady, persistedState?.playlistId, actions]);

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
  return ctx;
}


