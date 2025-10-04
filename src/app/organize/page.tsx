"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "~/components/auth/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserPlaylists, fetchPlaylistItems, fetchPlaylistSnippet, fetchVideoDurations, addVideoToPlaylist, deletePlaylistItem, updatePlaylistItemPosition } from "~/lib/youtube";
import type { YouTubeUserPlaylist, YouTubePlaylistItem, YouTubePlaylistSnippet } from "~/lib/youtube";
import { PlaylistSelector } from "~/components/organize/PlaylistSelector";
import { SkeletonPlaylistDetail } from "~/components/organize/SkeletonPlaylistDetail";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { env } from "~/env";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { PlaylistDetail } from "~/components/organize/PlaylistDetail";
import { MobilePlaylistHeader } from "~/components/organize/MobilePlaylistHeader";
import { MobilePlaylistSelector } from "~/components/organize/MobilePlaylistSelector";
import { MoveVideoDialog } from "~/components/organize/MoveVideoDialog";

type LoadingProgress = {
  pagesLoaded: number;
  totalPages?: number;
  itemsLoaded: number;
  totalItems?: number;
};

export default function OrganizePage() {
  const router = useRouter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  const [draggedVideo, setDraggedVideo] = useState<YouTubePlaylistItem | null>(null);
  const [isMovingVideo, setIsMovingVideo] = useState(false);
  const [isMobileHeaderExpanded, setIsMobileHeaderExpanded] = useState(false);
  const [videoToMove, setVideoToMove] = useState<YouTubePlaylistItem | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Redirect to home if not authenticated
  useEffect(() => {
    if (auth.isReady && !auth.isAuthenticated) {
      toast.error("You must be signed in to organize playlists");
      router.push("/");
    }
  }, [auth.isReady, auth.isAuthenticated, router]);

  // Reset loading progress when playlist changes
  useEffect(() => {
    setLoadingProgress(null);
  }, [selectedPlaylistId]);

  // Fetch user playlists
  const { data: playlists, isLoading: playlistsLoading, error: playlistsError } = useQuery({
    queryKey: ["userPlaylists", auth.accessToken],
    queryFn: async () => {
      try {
        return await fetchUserPlaylists({ 
          accessToken: auth.accessToken!, 
          refreshToken: auth.getTokenSilently 
        });
      } catch (err: any) {
        if (err.status === 401) {
          toast.error("Your session expired. Please sign in again.", {
            action: {
              label: "Sign In",
              onClick: () => auth.signIn(),
            },
          });
        }
        throw err;
      }
    },
    enabled: auth.isAuthenticated && Boolean(auth.accessToken),
    staleTime: 1000 * 60,
    retry: false,
  });

  // Fetch selected playlist details
  const { data: playlistSnippet, isLoading: snippetLoading } = useQuery({
    queryKey: ["playlistSnippet", selectedPlaylistId],
    queryFn: async () => {
      if (!selectedPlaylistId) return null;
      const snippet = await fetchPlaylistSnippet({
        accessToken: auth.accessToken,
        playlistId: selectedPlaylistId,
        refreshToken: auth.getTokenSilently,
      });
      
      // Initialize loading progress with total items from snippet
      if (snippet?.itemCount) {
        setLoadingProgress({
          pagesLoaded: 0,
          itemsLoaded: 0,
          totalItems: snippet.itemCount,
          totalPages: Math.ceil(snippet.itemCount / 50),
        });
      }
      
      return snippet;
    },
    enabled: Boolean(selectedPlaylistId),
  });

  // Fetch selected playlist items
  const { data: playlistItems, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ["playlistItems", selectedPlaylistId],
    queryFn: async () => {
      if (!selectedPlaylistId) return [];
      
      const aggregated: YouTubePlaylistItem[] = [];
      let nextPageToken: string | undefined = undefined;
      let pageCount = 0;
      
      do {
        const res = await fetchPlaylistItems({
          accessToken: auth.accessToken,
          playlistId: selectedPlaylistId,
          pageToken: nextPageToken,
          refreshToken: auth.getTokenSilently,
        });
        aggregated.push(...res.items);
        nextPageToken = res.nextPageToken;
        pageCount++;
        
        // Update loading progress after each page
        setLoadingProgress(prev => ({
          pagesLoaded: pageCount,
          totalPages: prev?.totalPages,
          itemsLoaded: aggregated.length,
          totalItems: prev?.totalItems ?? aggregated.length,
        }));
      } while (nextPageToken);
      
      // Fetch video durations
      const videoIds = aggregated.filter(item => item.videoId).map(item => item.videoId!);
      if (videoIds.length > 0) {
        try {
          const durations = await fetchVideoDurations({
            apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
            accessToken: auth.accessToken,
            videoIds,
            refreshToken: auth.getTokenSilently,
          });
          
          // Merge durations into items
          for (const item of aggregated) {
            if (item.videoId && durations.has(item.videoId)) {
              item.durationSeconds = durations.get(item.videoId);
            }
          }
        } catch (e) {
          // Continue without durations if fetch fails
          console.error("Failed to fetch video durations:", e);
        }
      }
      
      // Clear loading progress when done
      setLoadingProgress(null);
      
      return aggregated;
    },
    enabled: Boolean(selectedPlaylistId),
  });

  const handleVideoReorder = useCallback(async (itemId: string, oldIndex: number, newIndex: number) => {
    if (!auth.isAuthenticated || !auth.accessToken || !selectedPlaylistId || !playlistItems) return;

    const availableVideos = playlistItems.filter((i) => i.videoId);
    const item = availableVideos[oldIndex];
    if (!item) return;

    // Optimistic update: Immediately reorder in the query cache
    queryClient.setQueryData<YouTubePlaylistItem[]>(
      ["playlistItems", selectedPlaylistId],
      (old) => {
        if (!old) return old;
        const updated = [...old];
        const currentIndex = updated.findIndex(i => i.id === item.id);
        if (currentIndex === -1) return old;
        
        // Remove and reinsert at new position
        const [movedItem] = updated.splice(currentIndex, 1);
        if (!movedItem) return old;
        
        // Find the target item's position in the full list
        const targetItem = availableVideos[newIndex];
        if (!targetItem) return old;
        const targetIndex = updated.findIndex(i => i.id === targetItem.id);
        
        updated.splice(targetIndex, 0, movedItem);
        return updated;
      }
    );

    setIsMovingVideo(true);
    try {
      await updatePlaylistItemPosition({
        accessToken: auth.accessToken,
        playlistItemId: item.id,
        playlistId: selectedPlaylistId,
        videoId: item.videoId!,
        position: newIndex,
        refreshToken: auth.getTokenSilently,
      });

      // Don't refetch - trust the optimistic update since the API succeeded
      // YouTube's order will be correct, and the optimistic update already reflects it
      setIsMovingVideo(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to reorder video");
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["playlistItems", selectedPlaylistId] });
      setIsMovingVideo(false);
    }
  }, [auth.isAuthenticated, auth.accessToken, auth.getTokenSilently, selectedPlaylistId, playlistItems, queryClient]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    // Find the video being dragged from the current playlist
    const video = playlistItems?.find(item => item.id === active.id);
    if (video) {
      setDraggedVideo(video);
    }
  }, [playlistItems]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const currentDraggedVideo = draggedVideo; // Capture for use in async operations
    setDraggedVideo(null);

    if (!over || !currentDraggedVideo || !auth.accessToken) return;

    const targetId = over.id as string;
    
    // Check if target is a video (reordering within playlist)
    const targetVideo = playlistItems?.find(item => item.id === targetId);
    if (targetVideo && targetId !== active.id && selectedPlaylistId) {
      // Reorder within current playlist
      const availableVideos = (playlistItems ?? []).filter((i) => i.videoId);
      const oldIndex = availableVideos.findIndex((i) => i.id === active.id);
      const newIndex = availableVideos.findIndex((i) => i.id === targetId);

      if (oldIndex !== -1 && newIndex !== -1) {
        await handleVideoReorder(active.id as string, oldIndex, newIndex);
        return;
      }
    }

    // Check if dropped on a different playlist
    const targetPlaylist = playlists?.find(p => p.id === targetId);
    if (!targetPlaylist) return;
    
    // Don't do anything if dropped on the same playlist
    if (targetId === selectedPlaylistId) return;

    // Optimistic update: Immediately update the query cache to remove the video from current view
    queryClient.setQueryData<YouTubePlaylistItem[]>(
      ["playlistItems", selectedPlaylistId],
      (old) => old?.filter(item => item.id !== currentDraggedVideo.id) ?? []
    );

    setIsMovingVideo(true);

    try {
      // Add video to target playlist
      await addVideoToPlaylist({
        accessToken: auth.accessToken,
        playlistId: targetId,
        videoId: currentDraggedVideo.videoId!,
        refreshToken: auth.getTokenSilently,
      });

      // Remove from current playlist
      await deletePlaylistItem({
        accessToken: auth.accessToken,
        playlistItemId: currentDraggedVideo.id,
        refreshToken: auth.getTokenSilently,
      });

      toast.success(`Moved "${currentDraggedVideo.title}" to "${targetPlaylist.title}"`);

      // Only invalidate the target playlist (not the current one - we already updated it optimistically)
      // This ensures the target playlist will be fresh when the user switches to it
      queryClient.invalidateQueries({ queryKey: ["playlistItems", targetId] });
      
      setIsMovingVideo(false);
    } catch (e) {
      console.error(e);
      toast.error(`Failed to move video: ${(e as Error)?.message ?? "Unknown error"}`);
      
      // Revert optimistic update on error by refetching
      queryClient.invalidateQueries({ queryKey: ["playlistItems", selectedPlaylistId] });
      setIsMovingVideo(false);
    }
  }, [draggedVideo, selectedPlaylistId, playlists, playlistItems, auth.accessToken, auth.getTokenSilently, queryClient, handleVideoReorder]);

  const handleMobileMoveVideo = useCallback((item: YouTubePlaylistItem) => {
    setVideoToMove(item);
    setShowMoveDialog(true);
  }, []);

  const handleMoveVideoToPlaylist = useCallback(async (targetPlaylistId: string) => {
    if (!videoToMove || !auth.accessToken || !selectedPlaylistId) return;

    const targetPlaylist = playlists?.find(p => p.id === targetPlaylistId);
    if (!targetPlaylist) return;

    // Optimistic update: Immediately update the query cache to remove the video from current view
    queryClient.setQueryData<YouTubePlaylistItem[]>(
      ["playlistItems", selectedPlaylistId],
      (old) => old?.filter(item => item.id !== videoToMove.id) ?? []
    );

    setIsMovingVideo(true);

    try {
      // Add video to target playlist
      await addVideoToPlaylist({
        accessToken: auth.accessToken,
        playlistId: targetPlaylistId,
        videoId: videoToMove.videoId!,
        refreshToken: auth.getTokenSilently,
      });

      // Remove from current playlist
      await deletePlaylistItem({
        accessToken: auth.accessToken,
        playlistItemId: videoToMove.id,
        refreshToken: auth.getTokenSilently,
      });

      toast.success(`Moved "${videoToMove.title}" to "${targetPlaylist.title}"`);

      // Only invalidate the target playlist (not the current one - we already updated it optimistically)
      queryClient.invalidateQueries({ queryKey: ["playlistItems", targetPlaylistId] });
      
      setIsMovingVideo(false);
    } catch (e) {
      console.error(e);
      toast.error(`Failed to move video: ${(e as Error)?.message ?? "Unknown error"}`);
      
      // Revert optimistic update on error by refetching
      queryClient.invalidateQueries({ queryKey: ["playlistItems", selectedPlaylistId] });
      setIsMovingVideo(false);
      throw e; // Re-throw so dialog can handle it
    }
  }, [videoToMove, auth.accessToken, auth.getTokenSilently, selectedPlaylistId, playlists, queryClient]);

  // Don't render anything if not authenticated yet
  if (!auth.isReady || !auth.isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center pb-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Desktop layout */}
      <main className="hidden md:flex fixed inset-0 flex-col pb-24">
        {isMovingVideo && (
          <div className="fixed top-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Moving video...</span>
          </div>
        )}
        
        <div className="flex flex-1 min-h-0">
          {/* Left side - Playlist selector with independent scroll */}
          <div className="w-80 border-r border-border flex-shrink-0 overflow-y-auto">
            <PlaylistSelector
              playlists={playlists ?? []}
              isLoading={playlistsLoading}
              selectedPlaylistId={selectedPlaylistId}
              onSelectPlaylist={setSelectedPlaylistId}
            />
          </div>

          {/* Right side - Playlist details with independent scroll */}
          <div className="flex-1 overflow-y-auto min-w-0">
            {selectedPlaylistId ? (
              // Show skeleton while loading or when we have loading progress
              (snippetLoading || itemsLoading || loadingProgress) ? (
                <SkeletonPlaylistDetail
                  loadingProgress={loadingProgress}
                  playlistTitle={playlistSnippet?.title}
                />
              ) : (
                <PlaylistDetail
                  playlistId={selectedPlaylistId}
                  snippet={playlistSnippet}
                  items={playlistItems ?? []}
                  isLoading={false}
                  onItemsChanged={() => {
                    setLoadingProgress(null);
                    refetchItems();
                  }}
                  onReorderRequest={handleVideoReorder}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-lg">Select a playlist to manage</p>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {draggedVideo && (
            <div className="bg-background border rounded-lg shadow-xl p-3 flex items-center gap-3 w-96 opacity-90">
              {draggedVideo.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={draggedVideo.thumbnailUrl} 
                  alt="thumbnail" 
                  className="h-16 w-28 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{draggedVideo.title}</p>
                {draggedVideo.channelTitle && (
                  <p className="text-xs text-muted-foreground truncate">{draggedVideo.channelTitle}</p>
                )}
              </div>
            </div>
          )}
        </DragOverlay>
      </main>

      {/* Mobile layout */}
      <main className="md:hidden flex flex-col min-h-screen">
        {isMovingVideo && (
          <div className="fixed top-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Moving video...</span>
          </div>
        )}

        {selectedPlaylistId ? (
          <>
            {/* Mobile header with playlist selector */}
            <MobilePlaylistHeader
              snippet={playlistSnippet}
              thumbnailUrl={playlistItems?.[0]?.thumbnailUrl}
              playlists={playlists ?? []}
              selectedPlaylistId={selectedPlaylistId}
              onSelectPlaylist={setSelectedPlaylistId}
              isExpanded={isMobileHeaderExpanded}
              onToggleExpanded={() => setIsMobileHeaderExpanded(!isMobileHeaderExpanded)}
            />

            {/* Playlist detail content - only show when header is not expanded */}
            {!isMobileHeaderExpanded && (
              <div className="flex-1 overflow-y-auto">
                {(snippetLoading || itemsLoading || loadingProgress) ? (
                  <SkeletonPlaylistDetail
                    loadingProgress={loadingProgress}
                    playlistTitle={playlistSnippet?.title}
                  />
                ) : (
                  <PlaylistDetail
                    playlistId={selectedPlaylistId}
                    snippet={playlistSnippet}
                    items={playlistItems ?? []}
                    isLoading={false}
                    onItemsChanged={() => {
                      setLoadingProgress(null);
                      refetchItems();
                    }}
                    onReorderRequest={handleVideoReorder}
                    mobileMode={true}
                    onMobileMove={handleMobileMoveVideo}
                  />
                )}
              </div>
            )}

            {/* Move video dialog */}
            <MoveVideoDialog
              open={showMoveDialog}
              onOpenChange={setShowMoveDialog}
              video={videoToMove}
              playlists={playlists ?? []}
              currentPlaylistId={selectedPlaylistId}
              onMoveVideo={handleMoveVideoToPlaylist}
            />
          </>
        ) : (
          // Initial view - show playlist selector
          <MobilePlaylistSelector
            playlists={playlists ?? []}
            isLoading={playlistsLoading}
            onSelectPlaylist={setSelectedPlaylistId}
          />
        )}
      </main>
    </DndContext>
  );
}

