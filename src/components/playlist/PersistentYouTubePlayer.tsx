"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { usePlayer } from "~/components/playlist/PlayerContext";

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * PersistentYouTubePlayer lives in the layout and never unmounts.
 * It renders the YouTube iframe and moves it between visible locations using CSS.
 */
export function PersistentYouTubePlayer() {
  const pathname = usePathname();
  const playlist = usePlaylist();
  const player = usePlayer();
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const isPlayerPage = pathname === "/player";

  // Load YouTube IFrame API once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      // Will be handled in the video-specific effect
    };
  }, []);

  // Initialize player when video changes
  useEffect(() => {
    if (!playlist.currentVideoId || typeof window === 'undefined') return;

    const initPlayer = () => {
      if (window.YT && playerRef.current) {
        // Destroy existing player if it exists
        if (playerInstanceRef.current && playerInstanceRef.current.destroy) {
          try {
            playerInstanceRef.current.destroy();
          } catch (error) {
            console.warn('Error destroying existing player:', error);
          }
        }
        
        playerInstanceRef.current = new window.YT.Player(playerRef.current, {
          videoId: playlist.currentVideoId,
          playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
            fs: 1,
            cc_load_policy: 0,
            iv_load_policy: 3,
            disablekb: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              player.setPlayerInstance(event.target);
              
              // Check if there's saved progress for this video
              const savedProgress = player.getSavedProgress(playlist.currentVideoId!);
              if (savedProgress && savedProgress > 0) {
                try {
                  event.target.seekTo(savedProgress, true);
                } catch (error) {
                  console.warn('Failed to seek to saved position:', error);
                }
              }
              
              try {
                event.target.playVideo();
                player.setIsPlaying(true);
              } catch (error) {
                console.log('Autoplay prevented');
              }
            },
            onStateChange: (event: any) => {
              try {
                if (event?.data === window?.YT?.PlayerState?.PLAYING) {
                  player.setIsPlaying(true);
                } else if (event?.data === window?.YT?.PlayerState?.PAUSED) {
                  player.setIsPlaying(false);
                } else if (event?.data === window?.YT?.PlayerState?.ENDED) {
                  // Clear saved progress when video ends
                  player.clearSavedProgress(playlist.currentVideoId!);
                }
              } catch {}
            }
          }
        });
      }
    };

    if (window.YT) {
      setTimeout(initPlayer, 100);
    } else {
      (window as any).onYouTubeIframeAPIReady = () => {
        setTimeout(initPlayer, 100);
      };
    }
  }, [playlist.currentVideoId, player]);

  // Progress tracking
  useEffect(() => {
    if (!playerInstanceRef.current || !playlist.currentVideoId) return;

    const trackProgress = () => {
      try {
        if (!playerInstanceRef.current?.getCurrentTime || !playerInstanceRef.current?.getDuration) return;

        const currentTime = playerInstanceRef.current.getCurrentTime();
        const duration = playerInstanceRef.current.getDuration();

        if (duration > 0) {
          player.updateProgress(currentTime, duration, playlist.currentVideoId!);
        }
      } catch (e) {
        // Ignore errors
      }
    };

    const interval = setInterval(trackProgress, 1000);
    return () => clearInterval(interval);
  }, [playlist.currentVideoId, player.updateProgress]);

  if (!playlist.currentVideoId) return null;

  // Position the player based on current page
  // On player page: visible in the main content area
  // On other pages: visible in the mini player (small box)
  return (
    <div
      id="persistent-youtube-player-container"
      className={`
        ${isPlayerPage 
          ? 'fixed top-0 left-0 right-0 bottom-0 z-[100] pointer-events-none' 
          : 'fixed bottom-[88px] left-3 w-12 h-12 z-40 rounded overflow-hidden'
        }
      `}
    >
      <div
        ref={playerRef}
        id="persistent-youtube-player"
        className="w-full h-full"
        style={{
          // @ts-ignore
          WebkitPlaysInline: true,
          playsInline: true,
        }}
        playsInline={true}
      />
    </div>
  );
}
