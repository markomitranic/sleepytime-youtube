"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { YouTubePlaylistItem, YouTubePlaylistSnippet } from "~/lib/youtube";

export type PlaylistState = {
  url?: string;
  playlistId?: string;
  snippet?: YouTubePlaylistSnippet | null;
  items: YouTubePlaylistItem[];
  currentVideoId?: string;
};

export type PlaylistActions = {
  loadPlaylist: (params: {
    url: string;
    playlistId: string;
    snippet: YouTubePlaylistSnippet | null;
    items: YouTubePlaylistItem[];
    currentVideoId?: string;
  }) => void;
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
          };
        });
      },
      setCurrentVideoId: (videoId) => setState((s) => ({ ...s, currentVideoId: videoId })),
      clear: () => setState({ items: [] }),
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

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
  return ctx;
}


