"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Shuffle, SkipForward, Moon, GripVertical, Loader2, Trash2, Play, Pause, ArrowUpDown, ListVideo, ChevronRight, ChevronDown, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { usePlayer } from "~/components/playlist/PlayerContext";
import { SleepTimerDrawer } from "~/components/playlist/SleepTimerDrawer";
import { PlaylistSwitcherDrawer } from "~/components/playlist/PlaylistSwitcherDrawer";
import { useAuth } from "~/components/auth/useAuth";
import { deletePlaylistItem, updatePlaylistItemPosition, fetchUserPlaylists } from "~/lib/youtube";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type PlaylistItem = {
  id: string;
  videoId?: string;
  title: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  channelId?: string;
  durationSeconds?: number;
};

// Helper function to format duration (video timestamp)
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to format total duration (human readable)
function formatTotalDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

type SortableItemProps = {
  item: PlaylistItem;
  isCurrent: boolean;
  canEdit: boolean;
  onSelect: (videoId?: string) => void;
  onDelete: (itemId: string) => Promise<void>;
};

function SortablePlaylistItem({ item, isCurrent, canEdit, onSelect, onDelete }: SortableItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        className={`flex cursor-pointer items-start gap-3 rounded-md border py-3 pr-3 hover:bg-secondary select-none ${
          isCurrent ? "bg-secondary/60" : ""
        }`}
        onClick={() => {
          if (!item.videoId) {
            toast.error("This video is unavailable (private or removed)", {
              action: {
                label: "Copy error",
                onClick: () => {
                  try {
                    navigator.clipboard.writeText("This video is unavailable (private or removed)");
                  } catch {}
                },
              },
            });
            return;
          }
          onSelect(item.videoId);
        }}
      >
        {/* Drag handle on the left - hidden when cannot edit */}
        {canEdit && item.videoId && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="w-8 inline-flex items-center justify-center rounded transition-colors self-stretch flex-shrink-0 ml-1 text-white hover:text-white/80 hover:bg-secondary/50 cursor-grab active:cursor-grabbing touch-manipulation select-none touch-drag-handle"
            aria-label="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}
        
        {/* Thumbnail */}
        {item.thumbnailUrl && (
          <div className="relative h-16 w-28 rounded flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumbnailUrl} alt="thumbnail" className="h-full w-full rounded object-cover" />
            {item.durationSeconds !== undefined && (
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                {formatDuration(item.durationSeconds)}
              </div>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate font-medium ${isCurrent ? "opacity-80" : ""}`}>{item.title}</p>
          </div>
          {item.channelTitle && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">{item.channelTitle}</p>
              {isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" />
                  Playing
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Delete button on the right - hidden when cannot edit */}
        {canEdit && (item.videoId) && (
          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded self-center flex-shrink-0 transition-colors text-white hover:text-red-500 hover:bg-red-500/10"
            aria-label="Delete from playlist"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </li>
      
      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="p-0 overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center gap-4">
            <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <Trash2 className="size-8 text-red-500" />
            </div>
            <DialogHeader className="p-0">
              <DialogTitle>Delete from playlist?</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove &quot;{item.title}&quot; from the playlist?
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="gap-2 p-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Player() {
  const playlist = usePlaylist();
  const player = usePlayer();
  const auth = useAuth();
  const { data: userPlaylists } = useQuery({
    queryKey: ["userPlaylists", auth.accessToken],
    queryFn: async () => {
      if (!auth.isAuthenticated || !auth.accessToken) return [];
      try {
        return await fetchUserPlaylists({ accessToken: auth.accessToken, refreshToken: auth.getTokenSilently });
      } catch {
        return [];
      }
    },
    enabled: Boolean(auth.isAuthenticated && auth.accessToken),
    staleTime: 1000 * 60,
  });
  const canEdit = Boolean(
    auth.isAuthenticated &&
    playlist.playlistId &&
    (userPlaylists?.some(p => p.id === playlist.playlistId) ?? false)
  );
  const currentVideoId = playlist.currentVideoId;
  const playerRef = useRef<any>(null);
  const playerInstanceRef = useRef<any>(null);
  const [endedOpen, setEndedOpen] = useState<boolean>(false);
  const endedVideoIdRef = useRef<string | undefined>(undefined);
  const [shuffleEnabled, setShuffleEnabled] = useState<boolean>(false);
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const dialogShownForVideoRef = useRef<string | undefined>(undefined);
  const timeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [sortOrder, setSortOrder] = useState<"first-added" | "last-added">("first-added");
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort items based on sort order
  const sortedItems = useMemo(() => {
    if (sortOrder === "last-added") {
      return [...playlist.items].reverse();
    }
    return playlist.items; // first-added (default)
  }, [playlist.items, sortOrder]);

  // Calculate playlist metadata
  const playlistMetadata = useMemo(() => {
    const totalDuration = playlist.items.reduce((sum, item) => {
      return sum + (item.durationSeconds ?? 0);
    }, 0);

    return {
      totalDurationSeconds: totalDuration,
      videoCount: playlist.items.length,
    };
  }, [playlist.items]);

  const getNextVideoId = useCallback((fromVideoId: string | undefined): string | undefined => {
    if (!fromVideoId) return undefined;
    const availableVideos = playlist.items.filter(item => item.videoId);
    if (availableVideos.length === 0) return undefined;

    if (shuffleEnabled) {
      const otherVideos = availableVideos.filter(item => item.videoId !== fromVideoId);
      if (otherVideos.length === 0) return fromVideoId;
      const randomIndex = Math.floor(Math.random() * otherVideos.length);
      return otherVideos[randomIndex]?.videoId;
    }

    const currentIndex = availableVideos.findIndex(item => item.videoId === fromVideoId);
    if (currentIndex === -1) return undefined;
    const nextIndex = (currentIndex + 1) % availableVideos.length;
    return availableVideos[nextIndex]?.videoId;
  }, [playlist.items, shuffleEnabled]);

  const handleNext = useCallback((videoId: string | undefined) => {
    // Open dialog before switching, just like when video ends
    endedVideoIdRef.current = videoId;
    setEndedOpen(true);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!playerInstanceRef.current) return;
    
    if (isPlaying) {
      playerInstanceRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerInstanceRef.current.playVideo();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handlePlayNextFromDialog = useCallback(() => {
    const vid = endedVideoIdRef.current ?? currentVideoId;
    handleNext(vid);
    setEndedOpen(false);
  }, [currentVideoId, handleNext]);

  const handleRemoveAndPlayNext = useCallback(async () => {
    const videoId = endedVideoIdRef.current ?? currentVideoId;
    if (!videoId) return;
    if (!playlist.playlistId) return;

    // Pre-compute next video before deletion (respect shuffle toggle)
    const nextVideoId = getNextVideoId(videoId);

    try {
      if (!auth.isAuthenticated || !auth.accessToken) {
        toast.error("You must be signed in to remove from playlist.");
        return;
      }
      const currentItem = playlist.items.find(i => i.videoId === videoId);
      if (!currentItem) {
        toast.error("Couldn't find this video in the playlist.");
        return;
      }
      // Optimistic UI removal
      playlist.removeItem(videoId);
      setIsReordering(true);

      // Trigger background removal on YouTube and then background refresh
      deletePlaylistItem({ accessToken: auth.accessToken, playlistItemId: currentItem.id })
        .then(() => playlist.refreshItemsOnce({ delayMs: 900 }))
        .catch(async () => {
          // Soft reconcile by refreshing once even on failure
          await playlist.refreshItemsOnce({ delayMs: 900 });
        })
        .finally(() => {
          setIsReordering(false);
        });

      if (nextVideoId) {
        playlist.setCurrentVideoId(nextVideoId);
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to remove video.");
      setIsReordering(false);
    } finally {
      setEndedOpen(false);
    }
  }, [auth.isAuthenticated, auth.accessToken, currentVideoId, playlist.items, playlist.playlistId, playlist.refreshItemsOnce, playlist.setCurrentVideoId, getNextVideoId]);

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (!auth.isAuthenticated || !auth.accessToken) {
        toast.error("You must be signed in to delete from playlist.");
        throw new Error("Not authenticated");
      }
      if (!playlist.playlistId) {
        toast.error("No playlist selected.");
        throw new Error("No playlist");
      }

      const item = playlist.items.find((i) => i.id === itemId);
      if (!item) {
        toast.error("Couldn't find this video in the playlist.");
        throw new Error("Item not found");
      }

      // Optimistic UI removal
      const wasCurrentVideo = item.videoId === currentVideoId;
      playlist.removeItem(item.videoId!);
      setIsReordering(true);

      try {
        // Delete from YouTube
        await deletePlaylistItem({ 
          accessToken: auth.accessToken, 
          playlistItemId: itemId,
          refreshToken: auth.getTokenSilently,
        });
        
        // If we deleted the currently playing video, play the next one
        if (wasCurrentVideo) {
          const nextId = getNextVideoId(item.videoId!);
          if (nextId) {
            playlist.setCurrentVideoId(nextId);
          }
        }
        
        // Background refresh to ensure sync
        await playlist.refreshItemsOnce({ delayMs: 900 });
        toast.success("Video removed from playlist");
      } catch (e) {
        toast.error((e as Error)?.message ?? "Failed to remove video.");
        // Soft reconcile by refreshing on failure
        await playlist.refreshItemsOnce({ delayMs: 900 });
        throw e;
      } finally {
        setIsReordering(false);
      }
    },
    [auth.isAuthenticated, auth.accessToken, currentVideoId, playlist, getNextVideoId]
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setIsDragging(false);
      const { active, over } = event;

      if (!over || active.id === over.id) return;
      if (!auth.isAuthenticated || !auth.accessToken) return;
      if (!playlist.playlistId) return;

      const availableVideos = playlist.items.filter((i) => i.videoId);
      const oldIndex = availableVideos.findIndex((i) => i.id === active.id);
      const newIndex = availableVideos.findIndex((i) => i.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const movedItem = availableVideos[oldIndex]!;

      // Perform multiple single-step reorders to move the item to its target position
      // This uses the existing optimistic update mechanism
      if (oldIndex < newIndex) {
        // Moving down
        for (let i = 0; i < newIndex - oldIndex; i++) {
          playlist.reorderItem(movedItem.videoId!, "down");
        }
      } else {
        // Moving up
        for (let i = 0; i < oldIndex - newIndex; i++) {
          playlist.reorderItem(movedItem.videoId!, "up");
        }
      }

      setIsReordering(true);
      try {
        await updatePlaylistItemPosition({
          accessToken: auth.accessToken!,
          playlistItemId: movedItem.id,
          playlistId: playlist.playlistId,
          videoId: movedItem.videoId!,
          position: newIndex,
          refreshToken: auth.getTokenSilently,
        });
        // Background refresh with longer delay to ensure YouTube has processed the change
        // This happens in the background and won't cause a flicker since our optimistic update is already correct
        setTimeout(() => {
          playlist.refreshItemsOnce({ delayMs: 2000 }).catch(() => {
            // Silently fail - optimistic update is already in place
          }).finally(() => {
            setIsReordering(false);
          });
        }, 0);
      } catch (e) {
        console.error(e);
        // Only revert on error
        await playlist.refreshItemsOnce({ delayMs: 500 });
        setIsReordering(false);
      }
    },
    [auth.isAuthenticated, auth.accessToken, playlist.items, playlist.playlistId, playlist.refreshItemsOnce, playlist.reorderItem],
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

    // Reset dialog shown flag for new video
    dialogShownForVideoRef.current = undefined;

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
          videoId: currentVideoId,
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
            start: 0,
            end: 0,
            loop: 0,
            mute: 0,
            showinfo: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              // Store player instance in PlayerContext
              player.setPlayerInstance(event.target);
              
              // Check if there's saved progress for this video
              const savedProgress = player.getSavedProgress(currentVideoId);
              if (savedProgress && savedProgress > 0) {
                try {
                  event.target.seekTo(savedProgress, true);
                } catch (error) {
                  console.warn('Failed to seek to saved position:', error);
                }
              }
              
              // For iOS PWA, we need to ensure user interaction before autoplay
              const playVideo = () => {
                try {
                  event.target.playVideo();
                  setIsPlaying(true);
                  player.setIsPlaying(true);
                } catch (error) {
                  console.log('Autoplay prevented, user interaction required');
                  // If autoplay fails, we'll rely on user clicking play
                }
              };

              // Try to play immediately
              playVideo();

              // If that fails, add a click handler to the player container
              if (playerRef.current) {
                const handleUserInteraction = () => {
                  playVideo();
                  playerRef.current?.removeEventListener('click', handleUserInteraction);
                  playerRef.current?.removeEventListener('touchstart', handleUserInteraction);
                };
                
                playerRef.current.addEventListener('click', handleUserInteraction);
                playerRef.current.addEventListener('touchstart', handleUserInteraction);
              }
            },
            onStateChange: (event: any) => {
              try {
                if (event?.data === window?.YT?.PlayerState?.ENDED) {
                  // Clear saved progress when video ends
                  player.clearSavedProgress(currentVideoId);
                  endedVideoIdRef.current = currentVideoId;
                  setEndedOpen(true);
                } else if (event?.data === window?.YT?.PlayerState?.PLAYING) {
                  setIsPlaying(true);
                  player.setIsPlaying(true);
                } else if (event?.data === window?.YT?.PlayerState?.PAUSED) {
                  setIsPlaying(false);
                  player.setIsPlaying(false);
                }
              } catch {}
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
        try {
          playerInstanceRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying player on cleanup:', error);
        }
        playerInstanceRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [currentVideoId]);

  // Progress tracking for mini player
  useEffect(() => {
    if (!playerInstanceRef.current || !currentVideoId) return;

    // Clear any existing progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    const trackProgress = () => {
      try {
        if (!playerInstanceRef.current?.getCurrentTime || !playerInstanceRef.current?.getDuration) return;

        const currentTime = playerInstanceRef.current.getCurrentTime();
        const duration = playerInstanceRef.current.getDuration();

        if (duration > 0) {
          player.updateProgress(currentTime, duration, currentVideoId);
        }
      } catch (e) {
        // Ignore errors - player might not be ready yet
      }
    };

    // Track progress every second
    progressIntervalRef.current = setInterval(trackProgress, 1000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [currentVideoId, player.updateProgress]);

  // Check video time and show dialog 20s before end
  useEffect(() => {
    if (!playerInstanceRef.current || !currentVideoId) return;

    // Clear any existing interval
    if (timeCheckIntervalRef.current) {
      clearInterval(timeCheckIntervalRef.current);
    }

    const checkTime = () => {
      try {
        if (!playerInstanceRef.current?.getCurrentTime || !playerInstanceRef.current?.getDuration) return;

        const currentTime = playerInstanceRef.current.getCurrentTime();
        const duration = playerInstanceRef.current.getDuration();

        // Show dialog if we're within 20 seconds of the end and haven't shown it yet for this video
        if (duration > 0 && currentTime > 0) {
          const timeRemaining = duration - currentTime;
          if (timeRemaining <= 20 && timeRemaining > 0 && dialogShownForVideoRef.current !== currentVideoId) {
            dialogShownForVideoRef.current = currentVideoId;
            endedVideoIdRef.current = currentVideoId;
            setEndedOpen(true);
          }
        }
      } catch (e) {
        // Ignore errors - player might not be ready yet
      }
    };

    // Check every second
    timeCheckIntervalRef.current = setInterval(checkTime, 1000);

    return () => {
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
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
    <>
      {/* Sleep Timer Expiry Dialog */}
      {playlist.sleepTimer.expired && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-6 text-center border shadow-2xl">
            <div className="flex justify-center">
              <Moon className="h-16 w-16 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Time for Bed</h2>
              <p className="text-muted-foreground">
                Your sleep timer has expired. Sweet dreams!
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => {
                  playlist.prolongSleepTimer(15);
                  playlist.setCurrentVideoId(currentVideoId); // Resume video
                }}
                className="w-full"
              >
                Prolong for 15 Minutes
              </Button>
              <Button 
                onClick={() => playlist.dismissSleepExpiry()}
                variant="outline"
                className="w-full"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={endedOpen} onOpenChange={setEndedOpen}>
        <DialogContent className="p-0 overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center gap-4">
            <div className="size-16 rounded-full bg-blue-500/10 flex items-center justify-center">
              {/* Temporary SVG placeholder for sleeping koala */}
              <svg viewBox="0 0 64 64" aria-hidden="true" className="size-10">
                <defs>
                  <radialGradient id="g1" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#a3bffa" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </radialGradient>
                </defs>
                <rect x="0" y="0" width="64" height="64" fill="url(#g1)" opacity="0.2" />
                <circle cx="48" cy="16" r="6" fill="#cbd5e1" />
                <path d="M10 44 C 22 36, 42 36, 56 44" stroke="#64748b" strokeWidth="3" fill="none" />
                <g transform="translate(28,30)">
                  <circle cx="0" cy="0" r="8" fill="#94a3b8" />
                  <circle cx="-3" cy="-1" r="1.2" fill="#0f172a" />
                  <circle cx="3" cy="-1" r="1.2" fill="#0f172a" />
                  <ellipse cx="0" cy="2" rx="2.5" ry="2" fill="#475569" />
                  <path d="M-4 4 Q 0 6 4 4" stroke="#334155" strokeWidth="1.5" fill="none" />
                </g>
                <path d="M36 26 q 4 -4 8 0" stroke="#94a3b8" strokeWidth="2" fill="none" />
                <text x="8" y="18" fill="#cbd5e1" fontSize="6" fontFamily="ui-sans-serif">Z</text>
                <text x="13" y="13" fill="#94a3b8" fontSize="5" fontFamily="ui-sans-serif">Z</text>
              </svg>
            </div>
            <DialogHeader className="p-0">
              <DialogTitle>Sleepy yet?</DialogTitle>
              <DialogDescription>
                This is a good place to stop watching. Your phone will go to sleep unless you explicitly decide to continue.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="gap-2 p-4">
            <Button variant="outline" onClick={handlePlayNextFromDialog}>Play Next</Button>
            {auth.isAuthenticated && (
              <Button variant="destructive" onClick={handleRemoveAndPlayNext}>Remove &amp; Play Next</Button>
            )}
            <Button variant="ghost" onClick={() => setEndedOpen(false)}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New layout: Left side with video, Right sidebar with playlist */}
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
        {/* Left side: Video player and controls (2/3) */}
        <div className="flex-1 lg:w-2/3 flex flex-col gap-4">
          {/* Video Player */}
          <div className="aspect-video w-full overflow-hidden rounded-md border bg-black flex-shrink-0">
            <div
              ref={playerRef}
              id={`youtube-player-${currentVideoId}`}
              className="h-full w-full"
              style={{
                // @ts-ignore - These are valid CSS properties for iOS
                WebkitPlaysInline: true,
                playsInline: true,
                WebkitMediaControls: 'none',
                mediaControls: 'none'
              }}
              playsInline={true}
            />
          </div>

          {/* Video title and controls - wrapped with fade effect */}
          <div className={`flex-1 flex flex-col gap-4 transition-opacity duration-500 ${player.isInactive ? "opacity-30" : ""}`}>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold truncate" title={current?.title}>
                  {current?.title ?? ""}
                </h2>
                {current?.videoId && (
                  <button
                    onClick={() => window.open(`https://www.youtube.com/watch?v=${current.videoId}`, '_blank', 'noopener,noreferrer')}
                    className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Open video in new tab"
                    title="Open video in new tab"
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              {current?.channelTitle && (
                <a
                  href={`https://www.youtube.com/channel/${current.channelId || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate inline-flex items-center gap-1 w-fit"
                >
                  {current.channelTitle}
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                </a>
              )}
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-center gap-8 py-2">
              <button
                type="button"
                onClick={() => setShuffleEnabled((v) => !v)}
                className={`hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full transition focus-visible:ring-[3px] ${
                  shuffleEnabled ? "text-white border-2 border-white" : "text-muted-foreground"
                }`}
                aria-label={shuffleEnabled ? "Disable shuffle" : "Enable shuffle"}
              >
                <Shuffle className="h-5 w-5" />
              </button>
              
              <button
                type="button"
                onClick={handlePlayPause}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
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
                  className={`hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full transition focus-visible:ring-[3px] ${
                    playlist.sleepTimer.isActive 
                      ? "text-white border-2 border-white" 
                      : "text-muted-foreground"
                  }`}
                  aria-label={playlist.sleepTimer.isActive ? "Sleep timer active - click to modify" : "Set sleep timer"}
                >
                  <Moon className="h-5 w-5" />
                </button>
              </SleepTimerDrawer>
            </div>
          </div>
        </div>

        {/* Right sidebar: Playlist (1/3) */}
        <div className={`lg:w-1/3 flex flex-col lg:border-l pl-4 transition-opacity duration-500 ${player.isInactive ? "opacity-30" : ""}`}>
          {/* Loading spinner */}
          {isReordering && (
            <div className="flex items-center gap-2 text-muted-foreground pb-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}

          {/* Playlist header with metadata */}
          <div className="pb-4 space-y-3 border-b">
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              {playlist.items[0]?.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={playlist.items[0].thumbnailUrl}
                  alt={playlist.snippet?.title ?? "Playlist"}
                  className="w-20 h-[45px] rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-[45px] rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <ListVideo className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              {/* Title and metadata */}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-semibold text-sm truncate" title={playlist.snippet?.title}>
                  {playlist.snippet?.title ?? "Playlist"}
                </h3>
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span>{playlistMetadata.videoCount} video{playlistMetadata.videoCount !== 1 ? 's' : ''}</span>
                  {playlistMetadata.totalDurationSeconds > 0 && (
                    <span>{formatTotalDuration(playlistMetadata.totalDurationSeconds)} total</span>
                  )}
                </div>
              </div>
            </div>

            {/* Sort dropdown and playlist switcher */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Videos</span>
              <div className="flex items-center gap-2">
                <PlaylistSwitcherDrawer>
                  <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronDown className="h-3 w-3" />
                    <span>Switch</span>
                  </button>
                </PlaylistSwitcherDrawer>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowUpDown className="h-3 w-3" />
                      <span>{sortOrder === "first-added" ? "First added" : "Last added"}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortOrder("first-added")}>
                      First added
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder("last-added")}>
                      Last added
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Playlist items - scrollable */}
          <div className={`flex-1 pr-2 -mr-2 pt-2 touch-drag-container ${isDragging ? 'dragging' : 'overflow-y-auto'}`}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="grid grid-cols-1 gap-1">
                  {sortedItems.map((item) => {
                    const isCurrent = Boolean(currentVideoId && item.videoId === currentVideoId);
                    return (
                      <SortablePlaylistItem
                        key={item.id}
                        item={item}
                        isCurrent={isCurrent}
                        canEdit={canEdit}
                        onSelect={playlist.setCurrentVideoId}
                        onDelete={handleDeleteItem}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    </>
  );
}


