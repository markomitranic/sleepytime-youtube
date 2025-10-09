"use client";

import { useState } from "react";
import type { YouTubePlaylistItem } from "~/lib/youtube";
import { GripVertical, Trash2, RefreshCw } from "lucide-react";
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
  disableDragDrop?: boolean;
  onReplaceVideo?: (itemId: string, newVideoId: string) => Promise<void>;
  canEdit?: boolean;
};

type SortableItemProps = {
  item: YouTubePlaylistItem;
  onDelete: (itemId: string) => Promise<void>;
  disableDragDrop?: boolean;
  onReplaceVideo?: (itemId: string, newVideoId: string) => Promise<void>;
  canEdit?: boolean;
};

function SortableVideoItem({ item, onDelete, disableDragDrop, onReplaceVideo, canEdit }: SortableItemProps) {
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
  } = useSortable({ id: item.id, disabled: (disableDragDrop || !canEdit) });

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
        {canEdit && !disableDragDrop && item.videoId && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="w-10 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-grab active:cursor-grabbing self-stretch flex-shrink-0 touch-manipulation select-none touch-drag-handle"
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
            className={`h-16 w-28 rounded object-cover flex-shrink-0 ${(disableDragDrop || !canEdit) ? '' : '-ml-3'}`}
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
              <p className="text-xs text-muted-foreground">{item.channelTitle}</p>
            </div>
          )}
        </div>
        
        {/* Action buttons on the right */}
        <div className="flex items-center gap-1 self-center flex-shrink-0">
          {/* Replace button for deleted videos - only show if we have videoId for Wayback search */}
          {canEdit && isDeletedVideo && item.videoId && onReplaceVideo && (
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
          {canEdit && (item.videoId || isDeletedVideo) && (
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
  disableDragDrop = false,
  onReplaceVideo,
  canEdit = false,
}: SortableVideoListProps) {
  if (disableDragDrop) {
    // When sorting is active, just render without drag and drop
    return (
      <ul className="space-y-2">
        {items.map((item) => (
          <SortableVideoItem
            key={item.id}
            item={item}
            onDelete={onDelete}
            disableDragDrop={true}
            onReplaceVideo={onReplaceVideo}
            canEdit={canEdit}
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
            canEdit={canEdit}
          />
        ))}
      </ul>
    </SortableContext>
  );
}

