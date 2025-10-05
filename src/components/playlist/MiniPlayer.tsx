"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { usePlayer } from "~/components/playlist/PlayerContext";

export function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const playlist = usePlaylist();
  const player = usePlayer();

  // Don't show mini player on the player page or if no playlist is loaded
  if (pathname === "/player" || !playlist.playlistId || !playlist.currentVideoId) {
    return null;
  }

  const currentVideo = playlist.items.find(item => item.videoId === playlist.currentVideoId);
  if (!currentVideo) return null;

  const progressPercentage = player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0;

  const handleClick = () => {
    // Navigate to player page with current video
    const url = new URL(window.location.href);
    url.pathname = "/player";
    url.searchParams.set("list", playlist.playlistId!);
    url.searchParams.set("v", playlist.currentVideoId!);
    router.push(url.toString());
  };

  return (
    <div 
      className="fixed bottom-20 left-2.5 right-2.5 z-40 bg-background border border-border shadow-lg rounded-full overflow-hidden"
      onClick={handleClick}
    >
      {/* Main content */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors">
        {/* Thumbnail */}
        {currentVideo.thumbnailUrl && (
          <div className="w-12 h-12 rounded flex-shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={currentVideo.thumbnailUrl} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Title and playlist info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={currentVideo.title}>
            {currentVideo.title}
          </p>
          <p className="text-xs text-muted-foreground truncate" title={playlist.snippet?.title}>
            {playlist.snippet?.title || "Playlist"}
          </p>
        </div>
        
        {/* Up arrow icon */}
        <ChevronUp 
          className="h-6 w-6 text-foreground flex-shrink-0" 
          aria-label="Open player"
        />
      </div>
      
      {/* Progress bar at the bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
