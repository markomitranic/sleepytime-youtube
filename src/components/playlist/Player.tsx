"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shuffle, SkipForward, Moon, Github, Linkedin, ExternalLink, GripVertical, Loader2, Trash2, PictureInPicture } from "lucide-react";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { SleepTimerDrawer } from "~/components/playlist/SleepTimerDrawer";
import { useAuth } from "~/components/auth/useAuth";
import { deletePlaylistItem, updatePlaylistItemPosition } from "~/lib/youtube";
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
};

type SortableItemProps = {
  item: PlaylistItem;
  isCurrent: boolean;
  isAuthenticated: boolean;
  onSelect: (videoId?: string) => void;
  onDelete: (itemId: string) => Promise<void>;
};

function SortablePlaylistItem({ item, isCurrent, isAuthenticated, onSelect, onDelete }: SortableItemProps) {
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
  } = useSortable({ id: item.id });

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
        {/* Drag handle on the left */}
        {isAuthenticated && item.videoId && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="w-10 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-grab active:cursor-grabbing self-stretch flex-shrink-0 touch-none"
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
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="thumbnail" className="h-16 w-28 rounded object-cover flex-shrink-0 -ml-3" />
        )}
        
        {/* Content */}
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
        
        {/* Delete button on the right */}
        {isAuthenticated && item.videoId && (
          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 self-center flex-shrink-0 transition-colors"
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
  const auth = useAuth();
  const currentVideoId = playlist.currentVideoId;
  const playerRef = useRef<any>(null);
  const playerInstanceRef = useRef<any>(null);
  const [endedOpen, setEndedOpen] = useState<boolean>(false);
  const endedVideoIdRef = useRef<string | undefined>(undefined);
  const [shuffleEnabled, setShuffleEnabled] = useState<boolean>(false);
  const [isReordering, setIsReordering] = useState<boolean>(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


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
    const nextId = getNextVideoId(videoId);
    if (nextId) playlist.setCurrentVideoId(nextId);
  }, [getNextVideoId, playlist.setCurrentVideoId]);

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

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
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

  const handlePictureInPicture = useCallback(async () => {
    try {
      if (!playerInstanceRef.current) {
        toast.error("Player not ready");
        return;
      }

      // Get the iframe element
      const iframe = playerInstanceRef.current.getIframe();
      if (!iframe) {
        toast.error("Could not access video player");
        return;
      }

      // Check if Document Picture-in-Picture API is available
      if ('documentPictureInPicture' in window) {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 640,
          height: 360,
        });

        // Copy styles to PiP window
        const allCSS = [...document.styleSheets]
          .map((styleSheet) => {
            try {
              return [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
            } catch (e) {
              // Handle CORS-protected stylesheets
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = styleSheet.href || '';
              pipWindow.document.head.appendChild(link);
              return '';
            }
          })
          .filter(Boolean)
          .join('\n');

        const style = pipWindow.document.createElement('style');
        style.textContent = allCSS;
        pipWindow.document.head.appendChild(style);

        // Clone and move the iframe to PiP window
        const clonedIframe = iframe.cloneNode(true) as HTMLIFrameElement;
        clonedIframe.style.width = '100%';
        clonedIframe.style.height = '100%';
        clonedIframe.style.border = 'none';
        
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.overflow = 'hidden';
        pipWindow.document.body.appendChild(clonedIframe);

        // Hide original iframe
        iframe.style.display = 'none';

        // Restore original iframe when PiP window closes
        pipWindow.addEventListener('pagehide', () => {
          iframe.style.display = '';
        });

        toast.success("Picture-in-Picture activated!");
      } else {
        toast.error("Picture-in-Picture not supported in your browser", {
          description: "Try using Chrome, Edge, or another Chromium-based browser"
        });
      }
    } catch (error) {
      console.error('PiP error:', error);
      toast.error("Failed to enter Picture-in-Picture mode");
    }
  }, []);

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
            autoplay: 1,
            enablejsapi: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1
          },
          events: {
            onReady: (event: any) => {
              // Auto-start video when player is ready
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              try {
                if (event?.data === window?.YT?.PlayerState?.ENDED) {
                  endedVideoIdRef.current = currentVideoId;
                  setEndedOpen(true);
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
    <div className={`relative space-y-4 px-5 transition-opacity duration-300 ${playlist.darker ? "opacity-30" : ""}`}>
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
      {/* Loading spinner on right */}
      {isReordering && (
        <div className="absolute top-0 right-5 pointer-events-none z-10 pt-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Saving...</span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2 pt-2 pb-4">
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
          onClick={() => setShuffleEnabled((v) => !v)}
          className={`hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full transition focus-visible:ring-[3px] hover:text-foreground ${
            shuffleEnabled ? "bg-blue-500/15 text-white shadow-sm" : "text-muted-foreground"
          }`}
          aria-label={shuffleEnabled ? "Disable shuffle" : "Enable shuffle"}
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
        
        <button
          type="button"
          onClick={handlePictureInPicture}
          className="hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition focus-visible:ring-[3px] hover:text-foreground"
          aria-label="Picture-in-Picture"
        >
          <PictureInPicture className="h-5 w-5" />
        </button>
        
        <SleepTimerDrawer>
          <button
            type="button"
            className={`hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full transition focus-visible:ring-[3px] hover:text-foreground ${
              playlist.sleepTimer.isActive 
                ? "bg-blue-100 text-blue-600 shadow-sm" 
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={playlist.items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="grid grid-cols-1 gap-1">
            {playlist.items.map((item) => {
              const isCurrent = Boolean(currentVideoId && item.videoId === currentVideoId);
              return (
                <SortablePlaylistItem
                  key={item.id}
                  item={item}
                  isCurrent={isCurrent}
                  isAuthenticated={auth.isAuthenticated}
                  onSelect={playlist.setCurrentVideoId}
                  onDelete={handleDeleteItem}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

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


