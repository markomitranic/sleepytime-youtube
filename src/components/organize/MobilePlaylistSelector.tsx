"use client";

import type { YouTubeUserPlaylist } from "~/lib/youtube";
import { Loader2, Lock, Globe } from "lucide-react";
import { Badge } from "~/components/ui/badge";

type MobilePlaylistSelectorProps = {
  playlists: YouTubeUserPlaylist[];
  isLoading: boolean;
  onSelectPlaylist: (playlistId: string) => void;
};

export function MobilePlaylistSelector({ 
  playlists, 
  isLoading, 
  onSelectPlaylist 
}: MobilePlaylistSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen pb-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!playlists || playlists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen pb-24 p-4 text-center text-muted-foreground">
        <p>No playlists found</p>
        <p className="text-sm mt-2">Create playlists on YouTube to manage them here</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 p-4 space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Your Playlists</h2>
        <p className="text-sm text-muted-foreground">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
      </div>
      
      <ul className="space-y-2">
        {playlists.map((playlist) => (
          <li key={playlist.id}>
            <button
              type="button"
              onClick={() => onSelectPlaylist(playlist.id)}
              className="w-full text-left rounded-lg p-4 transition-colors border border-border hover:bg-secondary"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                {playlist.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={playlist.thumbnailUrl}
                    alt={playlist.title}
                    className="w-16 h-16 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-muted-foreground text-xs">No image</span>
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{playlist.title}</h3>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {/* Item count */}
                    <span className="text-sm text-muted-foreground">
                      {playlist.itemCount ?? 0} video{playlist.itemCount !== 1 ? 's' : ''}
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
  );
}
