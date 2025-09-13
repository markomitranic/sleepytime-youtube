"use client";

import { createContext, useContext, useMemo, useState } from "react";
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
  }) => void;
  setCurrentVideoId: (videoId: string | undefined) => void;
  clear: () => void;
};

const PlaylistContext = createContext<(PlaylistState & PlaylistActions) | null>(null);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlaylistState>({ items: [] });

  const actions: PlaylistActions = useMemo(
    () => ({
      loadPlaylist: ({ url, playlistId, snippet, items }) => {
        setState({
          url,
          playlistId,
          snippet,
          items,
          currentVideoId: items.find((i) => Boolean(i.videoId))?.videoId,
        });
      },
      setCurrentVideoId: (videoId) => setState((s) => ({ ...s, currentVideoId: videoId })),
      clear: () => setState({ items: [] }),
    }),
    [],
  );

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
  return ctx;
}


