"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { YouTubePlaylistItem, YouTubePlaylistSnippet } from "~/lib/youtube";
import { env } from "~/env";
import { extractPlaylistIdFromUrl, fetchPlaylistItems, fetchPlaylistSnippet } from "~/lib/youtube";

export type SleepTimer = {
  isActive: boolean;
  durationMinutes: number;
  startTime?: number;
  remainingSeconds?: number;
};

export type PlaylistState = {
  url?: string;
  playlistId?: string;
  snippet?: YouTubePlaylistSnippet | null;
  items: YouTubePlaylistItem[];
  currentVideoId?: string;
  isLoading?: boolean;
  error?: string | null;
  sleepTimer: SleepTimer;
  isPaused?: boolean; // New field to track if video is paused by sleep
};

export type PlaylistActions = {
  loadPlaylist: (params: {
    url: string;
    playlistId: string;
    snippet: YouTubePlaylistSnippet | null;
    items: YouTubePlaylistItem[];
    currentVideoId?: string;
  }) => void;
  loadFromUrl: (url: string) => Promise<void>;
  loadByPlaylistId: (playlistId: string) => Promise<void>;
  setCurrentVideoId: (videoId: string | undefined) => void;
  clear: () => void;
  setSleepTimer: (durationMinutes: number) => void;
  deactivateSleepTimer: () => void;
  triggerSleep: () => void;
};

const PlaylistContext = createContext<(PlaylistState & PlaylistActions) | null>(null);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlaylistState>({ 
    items: [], 
    sleepTimer: { isActive: false, durationMinutes: 30 },
    isPaused: false
  });

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
            sleepTimer: prev.sleepTimer, // Preserve existing sleep timer state
          };
        });
      },
      loadFromUrl: async (url) => {
        try {
          setState((s) => ({ ...s, isLoading: true, error: null }));
          const id = extractPlaylistIdFromUrl(url);
          if (!id) {
            setState((s) => ({ ...s, isLoading: false, error: "Invalid playlist URL. It must include a \"list\" parameter." }));
            return;
          }
          await actions.loadByPlaylistId(id);
          // Preserve provided URL for context consumers
          setState((s) => ({ ...s, url }));
        } catch (e) {
          setState((s) => ({ ...s, isLoading: false, error: (e as Error)?.message ?? "Failed to load playlist." }));
        }
      },
      loadByPlaylistId: async (playlistId) => {
        if (!env.NEXT_PUBLIC_YOUTUBE_API_KEY) {
          setState((s) => ({ ...s, isLoading: false, error: "Missing YouTube API key." }));
          return;
        }
        try {
          setState((s) => ({ ...s, isLoading: true, error: null }));
          // Aggregate items across pages
          let nextPageToken: string | undefined = undefined;
          const aggregated: YouTubePlaylistItem[] = [];
          do {
            const res = await fetchPlaylistItems({
              apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY!,
              playlistId,
              pageToken: nextPageToken,
            });
            aggregated.push(...res.items);
            nextPageToken = res.nextPageToken;
          } while (nextPageToken);

          const snippet = await fetchPlaylistSnippet({
            apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY!,
            playlistId,
          });

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
          setState((s) => ({ ...s, isLoading: false, error: (e as Error)?.message ?? "Failed to load playlist." }));
        }
      },
      setCurrentVideoId: (videoId) => setState((s) => ({ ...s, currentVideoId: videoId, isPaused: false })), // Resume when selecting a video
      clear: () => {
        setState({ items: [], sleepTimer: { isActive: false, durationMinutes: 30 }, isPaused: false });
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
          sleepTimer: { isActive: false, durationMinutes: s.sleepTimer.durationMinutes }
        }));
      },
      triggerSleep: () => {
        // Sleep action: pause video playback and deactivate timer
        // Keep playlist and current video, just mark as paused
        setState(s => ({
          ...s,
          isPaused: true, // Mark video as paused instead of clearing currentVideoId
          sleepTimer: { isActive: false, durationMinutes: s.sleepTimer.durationMinutes }
        }));
      },
    }),
    [],
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
          return {
            ...prev,
            sleepTimer: { isActive: false, durationMinutes: prev.sleepTimer.durationMinutes }
          };
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

  // Initialize from URL if ?list= is present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlObj = new URL(window.location.href);
    const list = urlObj.searchParams.get("list");
    if (!list) return;
    actions.loadByPlaylistId(list);
  }, []);

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
  return ctx;
}


