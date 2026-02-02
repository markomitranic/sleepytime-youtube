"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { usePlayer } from "~/components/playlist/PlayerContext";

type StickyPlayerBarProps = {
  playerContainerRef: React.RefObject<HTMLDivElement | null>;
};

export function StickyPlayerBar({ playerContainerRef }: StickyPlayerBarProps) {
  const playlist = usePlaylist();
  const player = usePlayer();
  const [isVideoHidden, setIsVideoHidden] = useState(false);

  const currentVideo = playlist.items.find(
    (item) => item.videoId === playlist.currentVideoId
  );

  // Track video player visibility using Intersection Observer
  useEffect(() => {
    if (!playerContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          // Show sticky bar when video is NOT visible (isIntersecting = false)
          setIsVideoHidden(!entry.isIntersecting);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(playerContainerRef.current);

    return () => observer.disconnect();
  }, [playerContainerRef]);

  const handlePlayPause = () => {
    if (!player.playerInstance) return;

    if (player.isPlaying) {
      player.playerInstance.pauseVideo();
    } else {
      player.playerInstance.playVideo();
    }
  };

  // Don't show if no video is playing
  if (!currentVideo || !currentVideo.videoId || !isVideoHidden) {
    return null;
  }

  const progress =
    player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0;

  return (
    <div
      className={`fixed top-1 left-1 right-1 lg:hidden z-50 glass-panel-elevated rounded-2xl transition-opacity duration-500 ${
        player.isInactive ? "opacity-30" : ""
      }`}
    >
      <div className="flex items-center gap-3 h-16 px-2">
        {/* Thumbnail */}
        {currentVideo.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentVideo.thumbnailUrl}
            alt={currentVideo.title}
            className="h-14 w-24 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-14 w-24 rounded bg-muted flex-shrink-0" />
        )}

        {/* Title and Progress */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentVideo.title}</p>
          {/* Progress bar */}
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 hover:bg-white/90 transition-colors"
          aria-label={player.isPlaying ? "Pause" : "Play"}
        >
          {player.isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}
