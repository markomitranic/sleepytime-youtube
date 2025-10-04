"use client";

import { useState } from "react";
import type { YouTubePlaylistItem } from "~/lib/youtube";
import { GripVertical, Trash2 } from "lucide-react";
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

type SortableVideoListProps = {
  items: YouTubePlaylistItem[];
  onDelete: (itemId: string) => Promise<void>;
  onReorder: (itemId: string, oldIndex: number, newIndex: number) => Promise<void>;
  isReordering: boolean;
  disableDragDrop?: boolean;
};

type SortableItemProps = {
  item: YouTubePlaylistItem;
  onDelete: (itemId: string) => Promise<void>;
  disableDragDrop?: boolean;
};

function SortableVideoItem({ item, onDelete, disableDragDrop }: SortableItemProps) {
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
        
        {/* Delete button on the right */}
        {item.videoId && (
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

export function SortableVideoList({ 
  items, 
  onDelete, 
  onReorder, 
  isReordering,
  disableDragDrop = false 
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
          />
        ))}
      </ul>
    </SortableContext>
  );
}

