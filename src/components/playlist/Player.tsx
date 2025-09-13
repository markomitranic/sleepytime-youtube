"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronUp, Shuffle, SkipForward, Moon } from "lucide-react";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { SleepTimerDrawer } from "~/components/playlist/SleepTimerDrawer";

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function Player() {
  const playlist = usePlaylist();
  const currentVideoId = playlist.currentVideoId;
  const playerRef = useRef<any>(null);
  const playerInstanceRef = useRef<any>(null);

  const handleBack = useCallback(() => {
    playlist.clear();
  }, [playlist]);

  const handleShuffle = useCallback((videoId: string | undefined) => {
    const availableVideos = playlist.items.filter(item => item.videoId);
    if (availableVideos.length === 0) return;
    
    // Filter out the current video to avoid selecting the same one
    const otherVideos = availableVideos.filter(item => item.videoId !== videoId);
    
    // If there's only one video total, or no other videos, don't shuffle
    if (otherVideos.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * otherVideos.length);
    const randomVideo = otherVideos[randomIndex];
    if (randomVideo?.videoId) {
      playlist.setCurrentVideoId(randomVideo.videoId);
    }
  }, [playlist.items, playlist.setCurrentVideoId]);

  const handleNext = useCallback((videoId: string | undefined) => {
    if (!videoId) return;
    
    const availableVideos = playlist.items.filter(item => item.videoId);
    const currentIndex = availableVideos.findIndex(item => item.videoId === videoId);
    
    if (currentIndex === -1) return;
    
    const nextIndex = (currentIndex + 1) % availableVideos.length;
    const nextVideo = availableVideos[nextIndex];
    
    if (nextVideo?.videoId) {
      playlist.setCurrentVideoId(nextVideo.videoId);
    }
  }, [playlist.items, playlist.setCurrentVideoId]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Load YouTube IFrame API script
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }

    // Define the API ready callback
    (window as any).onYouTubeIframeAPIReady = () => {
      // Will be handled in the video-specific effect
    };
  }, []);

  // Initialize player when video changes
  useEffect(() => {
    if (!currentVideoId || typeof window === 'undefined') return;

    const initPlayer = () => {
      if (window.YT && playerRef.current) {
        playerInstanceRef.current = new window.YT.Player(playerRef.current, {
          videoId: currentVideoId,
          playerVars: {
            enablejsapi: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1
          },
          events: {
            onReady: (event: any) => {
              // Player is ready
            }
          }
        });
      }
    };

    if (window.YT) {
      initPlayer();
    } else {
      // Wait for API to load
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerInstanceRef.current && playerInstanceRef.current.destroy) {
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }
    };
  }, [currentVideoId]);

  // Handle pause/play based on isPaused state
  useEffect(() => {
    if (!playerInstanceRef.current) return;

    if (playlist.isPaused) {
      playerInstanceRef.current.pauseVideo();
    } else if (playerInstanceRef.current.getPlayerState && playerInstanceRef.current.getPlayerState() === 2) {
      // Only resume if currently paused (state 2)
      playerInstanceRef.current.playVideo();
    }
  }, [playlist.isPaused]);

  // If no playlist items, don't render anything
  if (!playlist.items.length) return null;
  
  if (!currentVideoId) return null;
  
  const current = playlist.items.find((i) => i.videoId === currentVideoId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label="Back"
          onClick={handleBack}
          className="hover:bg-secondary/60 focus-visible:ring-ring/50 group inline-flex h-7 w-16 items-center justify-center rounded-md border text-muted-foreground transition focus-visible:ring-[3px]"
        >
          <ChevronUp className="text-current opacity-90 group-hover:opacity-100" width={28} height={14} strokeWidth={2.5} />
        </button>
        <h2 className="text-xl font-semibold text-center truncate w-full" title={playlist.snippet?.title ?? undefined}>
          {playlist.snippet?.title ?? "Playlist"}
        </h2>
      </div>

      {/* Video Player */}
      <div className="aspect-video w-full overflow-hidden rounded-md border bg-black">
        <div
          ref={playerRef}
          id={`youtube-player-${currentVideoId}`}
          className="h-full w-full"
        />
      </div>

      {/* Player Controls */}
      <div className="flex items-center justify-center gap-8 py-4">
        <button
          type="button"
          onClick={() => handleShuffle(currentVideoId)}
          className="hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full border text-muted-foreground transition focus-visible:ring-[3px] hover:text-foreground"
          aria-label="Shuffle playlist"
        >
          <Shuffle className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => handleNext(currentVideoId)}
          className="hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-14 w-14 items-center justify-center rounded-full border text-muted-foreground transition focus-visible:ring-[3px] hover:text-foreground"
          aria-label="Next video"
        >
          <SkipForward className="h-6 w-6" />
        </button>
        
        <SleepTimerDrawer>
          <button
            type="button"
            className={`hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full border transition focus-visible:ring-[3px] hover:text-foreground ${
              playlist.sleepTimer.isActive 
                ? "bg-blue-100 text-blue-600 border-blue-300 shadow-sm" 
                : "text-muted-foreground"
            }`}
            aria-label={playlist.sleepTimer.isActive ? "Sleep timer active - click to modify" : "Set sleep timer"}
          >
            <Moon className="h-5 w-5" />
          </button>
        </SleepTimerDrawer>
      </div>

      <ul className="grid grid-cols-1 gap-4">
        {playlist.items.map((item) => {
          const isCurrent = Boolean(currentVideoId && item.videoId === currentVideoId);
          return (
            <li
              key={item.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-secondary ${
                isCurrent ? "bg-secondary/60" : ""
              }`}
              onClick={() => item.videoId && playlist.setCurrentVideoId(item.videoId)}
            >
              {item.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnailUrl} alt="thumbnail" className="h-16 w-28 rounded object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`truncate font-medium ${isCurrent ? "opacity-80" : ""}`}>{item.title}</p>
                  {isCurrent && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" />
                      Playing
                    </span>
                  )}
                </div>
                {item.videoId && <p className="text-xs text-muted-foreground">Video ID: {item.videoId}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


