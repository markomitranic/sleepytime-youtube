"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { YouTubePlaylistItem, YouTubePlaylistSnippet } from "~/lib/youtube";
import { env } from "~/env";
import { extractPlaylistIdFromUrl, fetchPlaylistItems, fetchPlaylistSnippet } from "~/lib/youtube";

export type PlaylistState = {
  url?: string;
  playlistId?: string;
  snippet?: YouTubePlaylistSnippet | null;
  items: YouTubePlaylistItem[];
  currentVideoId?: string;
  isLoading?: boolean;
  error?: string | null;
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
};

const PlaylistContext = createContext<(PlaylistState & PlaylistActions) | null>(null);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlaylistState>({ items: [] });

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
            url,
            playlistId,
            snippet,
            items,
            currentVideoId: provided ?? preserved ?? fallback,
            isLoading: false,
            error: null,
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
      setCurrentVideoId: (videoId) => setState((s) => ({ ...s, currentVideoId: videoId })),
      clear: () => {
        setState({ items: [] });
        if (typeof window !== "undefined") {
          const urlObj = new URL(window.location.href);
          urlObj.searchParams.delete("list");
          urlObj.searchParams.delete("v");
          const newQuery = urlObj.searchParams.toString();
          const href = newQuery ? `${urlObj.pathname}?${newQuery}` : urlObj.pathname;
          window.history.replaceState(null, "", href);
        }
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


