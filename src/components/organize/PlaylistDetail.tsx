"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { YouTubePlaylistItem, YouTubePlaylistSnippet } from "~/lib/youtube";
import { useAuth } from "~/components/auth/useAuth";
import { deletePlaylistItem, addVideoToPlaylist } from "~/lib/youtube";
import { Loader2, ArrowUpDown, Clock, Calendar, CalendarClock } from "lucide-react";
import { SortableVideoList } from "~/components/organize/SortableVideoList";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";

type PlaylistDetailProps = {
  playlistId: string;
  snippet: YouTubePlaylistSnippet | null | undefined;
  items: YouTubePlaylistItem[];
  isLoading: boolean;
  onItemsChanged: () => void;
  onReorderRequest?: (itemId: string, oldIndex: number, newIndex: number) => Promise<void>;
  canEdit?: boolean;
};

type SortOrder = "default" | "title-asc" | "title-desc";

// Helper function to format seconds into readable duration
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PlaylistDetail({ 
  playlistId, 
  snippet, 
  items, 
  isLoading,
  onItemsChanged,
  onReorderRequest,
  canEdit = false,
}: PlaylistDetailProps) {
  const auth = useAuth();
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [isReordering, setIsReordering] = useState(false);

  // Calculate playlist metadata
  const playlistMetadata = useMemo(() => {
    const totalDuration = items.reduce((sum, item) => {
      return sum + (item.durationSeconds ?? 0);
    }, 0);

    const oldestVideoDate = items
      .filter(item => item.publishedAt)
      .reduce((oldest: string | null, item) => {
        if (!oldest || (item.publishedAt && item.publishedAt < oldest)) {
          return item.publishedAt!;
        }
        return oldest;
      }, null);

    return {
      totalDurationSeconds: totalDuration,
      oldestVideoDate,
    };
  }, [items]);

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (!auth.isAuthenticated || !auth.accessToken) {
        toast.error("You must be signed in to delete from playlist.");
        throw new Error("Not authenticated");
      }

      const item = items.find((i) => i.id === itemId);
      if (!item) {
        toast.error("Couldn't find this video in the playlist.");
        throw new Error("Item not found");
      }

      setIsReordering(true);
      
      try {
        await deletePlaylistItem({ 
          accessToken: auth.accessToken, 
          playlistItemId: itemId,
          refreshToken: auth.getTokenSilently,
        });
        
        toast.success("Video removed from playlist");
        
        // Refresh the items after a small delay to sync with server
        setTimeout(() => {
          onItemsChanged();
          setIsReordering(false);
        }, 700);
      } catch (e) {
        toast.error((e as Error)?.message ?? "Failed to remove video.");
        onItemsChanged();
        setIsReordering(false);
        throw e;
      }
    },
    [auth.isAuthenticated, auth.accessToken, auth.getTokenSilently, items, onItemsChanged]
  );

  const handleReplaceVideo = useCallback(
    async (itemId: string, newVideoId: string) => {
      if (!auth.isAuthenticated || !auth.accessToken) {
        toast.error("You must be signed in to replace videos.");
        throw new Error("Not authenticated");
      }

      const item = items.find((i) => i.id === itemId);
      if (!item) {
        toast.error("Couldn't find this video in the playlist.");
        throw new Error("Item not found");
      }

      // Find the position of the item in the playlist
      const itemIndex = items.findIndex((i) => i.id === itemId);
      if (itemIndex === -1) {
        toast.error("Couldn't find this video's position in the playlist.");
        throw new Error("Item position not found");
      }

      setIsReordering(true);
      
      try {
        // First, add the new video to the playlist at the same position
        await addVideoToPlaylist({
          accessToken: auth.accessToken,
          playlistId: playlistId,
          videoId: newVideoId,
          position: itemIndex,
          refreshToken: auth.getTokenSilently,
        });

        // Then, delete the old item
        await deletePlaylistItem({ 
          accessToken: auth.accessToken, 
          playlistItemId: itemId,
          refreshToken: auth.getTokenSilently,
        });
        
        toast.success("Video replaced successfully");
        
        // Refresh the items after a small delay to sync with server
        setTimeout(() => {
          onItemsChanged();
          setIsReordering(false);
        }, 700);
      } catch (e) {
        toast.error((e as Error)?.message ?? "Failed to replace video.");
        onItemsChanged();
        setIsReordering(false);
        throw e;
      }
    },
    [auth.isAuthenticated, auth.accessToken, auth.getTokenSilently, items, playlistId, onItemsChanged]
  );


  // Sort items based on sort order
  const sortedItems = [...items].sort((a, b) => {
    if (sortOrder === "title-asc") {
      return a.title.localeCompare(b.title);
    }
    if (sortOrder === "title-desc") {
      return b.title.localeCompare(a.title);
    }
    // default: maintain original order
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!snippet) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Failed to load playlist details</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* Loading indicator */}
      {isReordering && (
        <div className="absolute top-4 right-4 pointer-events-none z-10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Saving...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-6">
          {/* Large thumbnail */}
          {items[0]?.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={items[0].thumbnailUrl}
              alt={snippet.title}
              className="w-48 h-27 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-48 h-27 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}

          {/* Metadata */}
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-bold">{snippet.title}</h1>
            
            {snippet.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {snippet.description}
              </p>
            )}

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{snippet.itemCount ?? items.length} video{(snippet.itemCount ?? items.length) !== 1 ? 's' : ''}</span>
              
              {playlistMetadata.totalDurationSeconds > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Total length: {formatDuration(playlistMetadata.totalDurationSeconds)}</span>
                </div>
              )}

              {snippet.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {formatDate(snippet.publishedAt)}</span>
                </div>
              )}

              {playlistMetadata.oldestVideoDate && (
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  <span>Oldest video: {formatDate(playlistMetadata.oldestVideoDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar with sorting */}
      <div className="flex items-center justify-between border-t border-b py-3">
        <h2 className="text-lg font-semibold">Videos</h2>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortOrder("default")}>
              Default order
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder("title-asc")}>
              Title (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder("title-desc")}>
              Title (Z-A)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Video list */}
      {sortedItems.length > 0 ? (
        <SortableVideoList
          items={sortedItems}
          onDelete={handleDeleteItem}
          onReorder={async () => {}}
          isReordering={isReordering}
          // Disable drag and drop when sorting is active (not default order)
          disableDragDrop={sortOrder !== "default"}
          onReplaceVideo={handleReplaceVideo}
          canEdit={canEdit}
        />
      ) : (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p>This playlist is empty</p>
        </div>
      )}
    </div>
  );
}

