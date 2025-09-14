"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronUp, Shuffle, SkipForward, Moon, Github, Linkedin, ExternalLink, RefreshCw, Bed, ArrowUp, ArrowDown } from "lucide-react";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { SleepTimerDrawer } from "~/components/playlist/SleepTimerDrawer";
import { useAuth } from "~/components/auth/AuthContext";
import { updatePlaylistItemPosition } from "~/lib/youtube";

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function Player() {
  const playlist = usePlaylist();
  const auth = useAuth();
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

  const handleMove = useCallback(
    async (direction: "up" | "down", videoId?: string) => {
      if (!auth.isAuthenticated || !auth.accessToken) return;
      if (!videoId || !playlist.playlistId) return;
      const availableVideos = playlist.items.filter((i) => i.videoId);
      const currentIndex = availableVideos.findIndex((i) => i.videoId === videoId);
      if (currentIndex === -1) return;
      const newIndex = direction === "up" ? Math.max(0, currentIndex - 1) : Math.min(availableVideos.length - 1, currentIndex + 1);
      if (newIndex === currentIndex) return;
      const currentItem = availableVideos[currentIndex]!;
      try {
        await updatePlaylistItemPosition({
          accessToken: auth.accessToken!,
          playlistItemId: currentItem.id,
          playlistId: playlist.playlistId,
          videoId: currentItem.videoId!,
          position: newIndex,
        });
        await playlist.loadByPlaylistId(playlist.playlistId);
      } catch (e) {
        // swallow
        console.error(e);
      }
    },
    [auth.isAuthenticated, auth.accessToken, playlist.items, playlist.playlistId, playlist.loadByPlaylistId],
  );

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
    <div className={`relative space-y-4 transition-opacity duration-300 ${playlist.darker ? "opacity-30" : ""}`}>
      {/* Corner Icons */}
      <div className="absolute top-0 left-0 right-0 flex justify-between pointer-events-none z-10">
        <button
          type="button"
          onClick={() => playlist.reloadPlaylist()}
          className="pointer-events-auto hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition focus-visible:ring-[3px] hover:text-foreground bg-background/80 border"
          aria-label="Refresh playlist"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => playlist.toggleDarker()}
          className={`pointer-events-auto hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-8 w-8 items-center justify-center rounded-md transition focus-visible:ring-[3px] hover:text-foreground bg-background/80 border ${
            playlist.darker
              ? "bg-blue-100 text-blue-600 border-blue-300 shadow-sm dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"
              : "text-muted-foreground"
          }`}
          aria-label={playlist.darker ? "Show aurora animation" : "Hide aurora animation"}
        >
          <Bed className="h-4 w-4" />
        </button>
      </div>

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

      {/* Playlist Divider */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-border"></div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Playlist</h3>
        <div className="flex-1 h-px bg-border"></div>
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
                </div>
                {item.channelTitle && (
                  <div className="flex flex-col gap-1">
                    {item.channelId ? (
                      <a
                        href={`https://www.youtube.com/channel/${item.channelId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.channelTitle}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">{item.channelTitle}</p>
                    )}
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground w-fit">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" />
                        Playing
                      </span>
                    )}
                  </div>
                )}
              </div>
              {auth.isAuthenticated && item.videoId && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    className="h-6 w-6 inline-flex items-center justify-center rounded border text-muted-foreground hover:text-foreground hover:bg-secondary"
                    aria-label="Move up"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove("up", item.videoId);
                    }}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="h-6 w-6 inline-flex items-center justify-center rounded border text-muted-foreground hover:text-foreground hover:bg-secondary"
                    aria-label="Move down"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove("down", item.videoId);
                    }}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Footer with social links */}
      <div className="flex items-center justify-center gap-6 pt-8 pb-4 mt-8 border-t">
        <a
          href="https://github.com/markomitranic/sleepytime-youtube"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="View on GitHub"
        >
          <Github className="h-5 w-5" />
          <span className="text-sm">GitHub</span>
        </a>
        
        <a
          href="https://www.linkedin.com/in/marko-mitranic/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="LinkedIn Profile"
        >
          <Linkedin className="h-5 w-5" />
          <span className="text-sm">LinkedIn</span>
        </a>
        
        <a
          href="https://medium.com/homullus"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Medium Blog"
        >
          <ExternalLink className="h-5 w-5" />
          <span className="text-sm">Medium</span>
        </a>
      </div>
    </div>
  );
}


