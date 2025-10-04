"use client";

import { useState } from "react";
import type { YouTubeUserPlaylist, YouTubePlaylistItem } from "~/lib/youtube";
import { Lock, Globe, MoveRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";

type MoveVideoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: YouTubePlaylistItem | null;
  playlists: YouTubeUserPlaylist[];
  currentPlaylistId: string;
  onMoveVideo: (targetPlaylistId: string) => Promise<void>;
};

export function MoveVideoDialog({
  open,
  onOpenChange,
  video,
  playlists,
  currentPlaylistId,
  onMoveVideo,
}: MoveVideoDialogProps) {
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async (targetPlaylistId: string) => {
    if (targetPlaylistId === currentPlaylistId) {
      onOpenChange(false);
      return;
    }

    setIsMoving(true);
    try {
      await onMoveVideo(targetPlaylistId);
      onOpenChange(false);
    } finally {
      setIsMoving(false);
    }
  };

  // Filter out the current playlist
  const availablePlaylists = playlists.filter((p) => p.id !== currentPlaylistId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Move video to playlist</DialogTitle>
          <DialogDescription>
            Select a playlist to move &quot;{video?.title}&quot; to
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {availablePlaylists.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">No other playlists available</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {availablePlaylists.map((playlist) => (
                <li key={playlist.id}>
                  <button
                    type="button"
                    onClick={() => handleMove(playlist.id)}
                    disabled={isMoving}
                    className="w-full text-left rounded-lg p-3 transition-colors border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
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

                      {/* Move icon */}
                      <div className="flex-shrink-0 self-center">
                        <MoveRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
