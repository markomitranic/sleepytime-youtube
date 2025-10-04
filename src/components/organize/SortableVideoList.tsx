"use client";

import { useState } from "react";
import type { YouTubePlaylistItem } from "~/lib/youtube";
import { GripVertical, Trash2, RefreshCw, MoveRight } from "lucide-react";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { ReplaceVideoDrawer } from "~/components/organize/ReplaceVideoDrawer";

type SortableVideoListProps = {
  items: YouTubePlaylistItem[];
  onDelete: (itemId: string) => Promise<void>;
  onReorder: (itemId: string, oldIndex: number, newIndex: number) => Promise<void>;
  isReordering: boolean;
  disableDragDrop?: boolean;
  onReplaceVideo?: (itemId: string, newVideoId: string) => Promise<void>;
  mobileMode?: boolean;
  onMobileMove?: (item: YouTubePlaylistItem) => void;
};

type SortableItemProps = {
  item: YouTubePlaylistItem;
  onDelete: (itemId: string) => Promise<void>;
  disableDragDrop?: boolean;
  onReplaceVideo?: (itemId: string, newVideoId: string) => Promise<void>;
  mobileMode?: boolean;
  onMobileMove?: (item: YouTubePlaylistItem) => void;
};

function SortableVideoItem({ item, onDelete, disableDragDrop, onReplaceVideo, mobileMode, onMobileMove }: SortableItemProps) {
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
  } = useSortable({ id: item.id, disabled: disableDragDrop });

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

  const handleReplaceVideo = async (newVideoId: string) => {
    if (!onReplaceVideo) return;
    await onReplaceVideo(item.id, newVideoId);
  };

  // Detect deleted or private videos
  // YouTube returns items with videoId but title like "Deleted video" or "Private video"
  // OR items without videoId at all
  const isDeletedVideo = !item.videoId || 
    item.title === "Deleted video" || 
    item.title === "Private video" ||
    item.title === "Deleted Video" ||
    item.title === "Private Video";

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        className="flex items-start gap-3 rounded-md border py-3 pr-3 hover:bg-secondary select-none"
      >
        {/* Drag handle on the left */}
        {!disableDragDrop && item.videoId && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="w-10 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-grab active:cursor-grabbing self-stretch flex-shrink-0 touch-none"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}
        
        {/* Thumbnail */}
        {item.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={item.thumbnailUrl} 
            alt="thumbnail" 
            className={`h-16 w-28 rounded object-cover flex-shrink-0 ${disableDragDrop ? '' : '-ml-3'}`}
          />
        )}
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{item.title}</p>
            {isDeletedVideo && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 flex-shrink-0">
                Deleted
              </span>
            )}
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
            </div>
          )}
        </div>
        
        {/* Action buttons on the right */}
        <div className="flex items-center gap-1 self-center flex-shrink-0">
          {/* Mobile mode: Show move button instead of drag handle */}
          {mobileMode && item.videoId && onMobileMove && (
            <button
              type="button"
              className="h-8 w-8 inline-flex items-center justify-center rounded text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
              aria-label="Move to another playlist"
              onClick={(e) => {
                e.stopPropagation();
                onMobileMove(item);
              }}
            >
              <MoveRight className="h-4 w-4" />
            </button>
          )}
          
          {/* Replace button for deleted videos - only show if we have videoId for Wayback search */}
          {isDeletedVideo && item.videoId && onReplaceVideo && (
            <ReplaceVideoDrawer
              videoId={item.videoId}
              onReplaceVideo={handleReplaceVideo}
            >
              <button
                type="button"
                className="h-8 w-8 inline-flex items-center justify-center rounded text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                aria-label="Search for alternatives"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </ReplaceVideoDrawer>
          )}
          
          {/* Delete button - show for all items with videoId, or deleted items without replacement option */}
          {(item.videoId || isDeletedVideo) && (
            <button
              type="button"
              className="h-8 w-8 inline-flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              aria-label="Delete from playlist"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
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

export function SortableVideoList({ 
  items, 
  onDelete, 
  onReorder, 
  isReordering,
  disableDragDrop = false,
  onReplaceVideo,
  mobileMode = false,
  onMobileMove,
}: SortableVideoListProps) {
  if (disableDragDrop || mobileMode) {
    // When sorting is active or mobile mode, just render without drag and drop
    return (
      <ul className="space-y-2">
        {items.map((item) => (
          <SortableVideoItem
            key={item.id}
            item={item}
            onDelete={onDelete}
            disableDragDrop={true}
            onReplaceVideo={onReplaceVideo}
            mobileMode={mobileMode}
            onMobileMove={onMobileMove}
          />
        ))}
      </ul>
    );
  }

  // Use SortableContext without DndContext (parent provides it)
  return (
    <SortableContext
      items={items.map((item) => item.id)}
      strategy={verticalListSortingStrategy}
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <SortableVideoItem
            key={item.id}
            item={item}
            onDelete={onDelete}
            disableDragDrop={disableDragDrop}
            onReplaceVideo={onReplaceVideo}
            mobileMode={mobileMode}
            onMobileMove={onMobileMove}
          />
        ))}
      </ul>
    </SortableContext>
  );
}

