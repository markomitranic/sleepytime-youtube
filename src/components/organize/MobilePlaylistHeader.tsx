"use client";

import { useState } from "react";
import type { YouTubeUserPlaylist, YouTubePlaylistSnippet } from "~/lib/youtube";
import { ChevronDown, ChevronUp, Lock, Globe } from "lucide-react";
import { Badge } from "~/components/ui/badge";

type MobilePlaylistHeaderProps = {
  snippet: YouTubePlaylistSnippet | null | undefined;
  thumbnailUrl?: string;
  playlists: YouTubeUserPlaylist[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
};

export function MobilePlaylistHeader({
  snippet,
  thumbnailUrl,
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  isExpanded,
  onToggleExpanded,
}: MobilePlaylistHeaderProps) {
  const handlePlaylistSelect = (playlistId: string) => {
    onSelectPlaylist(playlistId);
    onToggleExpanded(); // Close the dropdown after selection
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-background border-b border-border z-10">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleExpanded}
        className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors"
      >
        {/* Thumbnail */}
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={snippet?.title ?? "Playlist"}
            className="w-16 h-16 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-muted-foreground text-xs">No image</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 text-left">
          <h1 className="font-bold truncate">{snippet?.title ?? "Select a playlist"}</h1>
          <p className="text-sm text-muted-foreground">
            {snippet?.itemCount ?? 0} video{snippet?.itemCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Expand/collapse icon */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded playlist list */}
      {isExpanded && (
        <div className="max-h-[60vh] overflow-y-auto border-t border-border bg-background">
          <div className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
            </p>
            <ul className="space-y-1">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <button
                    type="button"
                    onClick={() => handlePlaylistSelect(playlist.id)}
                    className={`w-full text-left rounded-lg p-3 transition-colors ${
                      selectedPlaylistId === playlist.id
                        ? "bg-secondary border border-border"
                        : "hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      {playlist.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={playlist.thumbnailUrl}
                          alt={playlist.title}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-muted-foreground text-xs">No image</span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-sm">{playlist.title}</h3>

                        <div className="flex items-center gap-2 mt-1">
                          {/* Item count */}
                          <span className="text-xs text-muted-foreground">
                            {playlist.itemCount ?? 0} video{playlist.itemCount !== 1 ? "s" : ""}
                          </span>

                          {/* Privacy badge */}
                          {playlist.privacyStatus === "private" && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                          {playlist.privacyStatus === "public" && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
